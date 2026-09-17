from accounts.models import KioskDevice
from common.testing import TenantAPITestCase


class KioskClaimTests(TenantAPITestCase):
    """One key, one install, one app — claimed exactly once."""

    def setUp(self):
        super().setUp()
        self.device = KioskDevice.objects.create(tenant=self.tenant, name="Main Gate", app="exit")

    def claim(self, installation_id="install-a", app="exit", api_key=None):
        return self.client.post(
            "/api/kiosk-devices/claim/",
            {"apiKey": api_key or self.device.api_key, "installationId": installation_id, "app": app},
            format="json",
        )

    def kiosk_get(self, installation_id):
        headers = {"HTTP_X_KIOSK_API_KEY": self.device.api_key}
        if installation_id is not None:
            headers["HTTP_X_KIOSK_INSTALL_ID"] = installation_id
        return self.client.get("/api/vehicles/by-code/nothing/", **headers)

    def test_new_devices_do_not_collide_on_installation_id(self):
        # An untouched CharField defaults to "", which would break the unique
        # constraint on the second device.
        second = KioskDevice.objects.create(tenant=self.tenant, name="Pump", app="fuel")
        self.assertIsNone(self.device.installation_id)
        self.assertIsNone(second.installation_id)

    def test_first_claim_binds(self):
        response = self.claim()
        self.assertEqual(response.status_code, 200)
        self.device.refresh_from_db()
        self.assertEqual(self.device.installation_id, "install-a")
        self.assertIsNotNone(self.device.claimed_at)

    def test_same_install_can_retry(self):
        self.claim()
        self.assertEqual(self.claim().status_code, 200)

    def test_other_install_is_refused(self):
        self.claim()
        self.assertEqual(self.claim(installation_id="install-b").status_code, 409)
        self.device.refresh_from_db()
        self.assertEqual(self.device.installation_id, "install-a")

    def test_wrong_app_is_refused(self):
        self.assertEqual(self.claim(app="fuel").status_code, 403)

    def test_unknown_key_is_404(self):
        self.assertEqual(self.claim(api_key="0" * 64).status_code, 404)

    def test_unclaimed_key_cannot_authenticate(self):
        self.assertEqual(self.kiosk_get("install-a").status_code, 401)

    def test_bound_key_needs_matching_install(self):
        self.claim()
        self.assertEqual(self.kiosk_get("install-a").status_code, 404)  # authenticated; vehicle just isn't there
        self.assertEqual(self.kiosk_get("install-b").status_code, 401)
        self.assertEqual(self.kiosk_get(None).status_code, 401)

    def test_reissue_burns_the_old_key(self):
        self.claim()
        old_key = self.device.api_key
        admin = self.make_user("admin1")
        response = self.as_user(admin).post(f"/api/kiosk-devices/{self.device.id}/reissue/")
        self.assertEqual(response.status_code, 200)
        self.device.refresh_from_db()
        self.assertNotEqual(self.device.api_key, old_key)
        self.assertIsNone(self.device.installation_id)
        self.client.force_authenticate(user=None)
        self.assertEqual(
            self.client.get("/api/vehicles/by-code/x/", HTTP_X_KIOSK_API_KEY=old_key, HTTP_X_KIOSK_INSTALL_ID="install-a").status_code,
            401,
        )


from contextlib import contextmanager  # noqa: E402

from django.db import connection  # noqa: E402

from accounts.models import Permission, Role, User  # noqa: E402
from accounts.permissions_catalog import ALL_PERMISSIONS  # noqa: E402


class RbacTestCase(TenantAPITestCase):
    def setUp(self):
        super().setUp()
        self.admin = self.make_user("admin1")
        self.roles = {r.name: r for r in Role.objects.filter(tenant=self.tenant)}

    def staff(self, username, role_name=None, direct=()):
        user = self.make_user(
            username, user_type=User.UserType.STAFF, role=self.roles[role_name] if role_name else None
        )
        user.direct_permissions.set(Permission.objects.filter(codename__in=direct))
        return user

    @contextmanager
    def other_tenant(self, schema_name):
        """A second company, created (and dropped) from the public schema as
        django-tenants requires."""
        from tenants.models import Tenant

        connection.set_schema_to_public()
        other = Tenant.objects.create(schema_name=schema_name, name=schema_name)
        connection.set_tenant(self.tenant)
        try:
            yield other
        finally:
            connection.set_schema_to_public()
            other.delete(force_drop=True)
            connection.set_tenant(self.tenant)


class EffectivePermissionTests(RbacTestCase):
    def test_new_tenant_gets_default_roles(self):
        self.assertEqual(set(self.roles), {"Fleet Manager", "Management", "Gate Guard"})

    def test_admin_has_everything(self):
        self.assertEqual(self.admin.get_effective_permissions(), frozenset(ALL_PERMISSIONS))

    def test_staff_without_role_has_nothing(self):
        self.assertEqual(self.staff("s1").get_effective_permissions(), frozenset())

    def test_direct_permissions_add_to_the_role(self):
        user = self.staff("s1", "Gate Guard", direct=["audit.view"])
        perms = user.get_effective_permissions()
        self.assertTrue({"gate.exit", "gate.entry", "gate.fuel", "audit.view"} <= perms)

    def test_actions_imply_view(self):
        perms = self.staff("s1", direct=["drivers.edit"]).get_effective_permissions()
        self.assertEqual(perms, frozenset({"drivers.edit", "drivers.view"}))

    def test_role_from_another_tenant_is_ignored(self):
        with self.other_tenant("othertenant") as other:
            foreign = Role.objects.get(tenant=other, name="Fleet Manager")
            user = self.staff("s1")
            user.role = foreign
            user.save()
            self.assertEqual(User.objects.get(pk=user.pk).get_effective_permissions(), frozenset())
            user.role = None
            user.save()


# (method, url) -> the roles the OLD fixed-role rules let through. Admin could
# always do everything, so it isn't listed. The migrated roles must match,
# except the deliberate changes noted at the bottom.
LEGACY_ACCESS = {
    ("get", "/api/vehicles/"): {"fleet_manager", "management", "gate_guard"},
    ("post", "/api/vehicles/"): {"fleet_manager"},
    ("get", "/api/vehicles/by-code/x/"): {"fleet_manager", "gate_guard"},
    ("post", "/api/vehicles/read-odometer/"): {"fleet_manager", "gate_guard"},
    ("get", "/api/drivers/"): {"fleet_manager", "management", "gate_guard"},
    ("post", "/api/drivers/"): {"fleet_manager"},
    ("get", "/api/guards/"): {"fleet_manager", "management", "gate_guard"},
    ("post", "/api/guards/"): set(),
    ("get", "/api/trips/"): {"fleet_manager", "management", "gate_guard"},
    ("get", "/api/fuel-entries/"): {"fleet_manager", "management"},
    ("post", "/api/fuel-entries/"): {"fleet_manager", "gate_guard"},
    ("get", "/api/odometer-issues/"): {"fleet_manager"},
    ("get", "/api/maintenance-records/"): {"fleet_manager", "management"},
    ("post", "/api/maintenance-records/"): {"fleet_manager"},
    ("get", "/api/tyres/"): {"fleet_manager", "management"},
    ("get", "/api/documents/"): {"fleet_manager", "management"},
    ("post", "/api/documents/"): {"fleet_manager"},
    ("get", "/api/requisitions/"): {"fleet_manager", "management"},
    ("post", "/api/requisitions/"): {"fleet_manager"},
    ("get", "/api/alerts/"): {"fleet_manager", "management"},
    ("post", "/api/alerts/"): {"fleet_manager", "gate_guard"},
    ("get", "/api/audit-log/"): set(),
    ("get", "/api/settings/"): set(),
    ("patch", "/api/settings/"): set(),
    ("get", "/api/vehicle-types/"): {"fleet_manager", "management", "gate_guard"},
    ("post", "/api/vehicle-types/"): set(),
    ("post", "/api/vehicle-reference-data/add/"): set(),
    ("get", "/api/users/"): set(),
    ("get", "/api/auth/roles/"): set(),
    ("get", "/api/auth/permissions/"): set(),
    ("get", "/api/kiosk-devices/"): set(),
}

# Deliberate differences, each because the role had API access to data behind
# a screen it never had:
DELIBERATE_CHANGES = {
    # Guards lookups at the gate only need gate.exit; nothing else read the list.
    ("get", "/api/guards/"): {"fleet_manager", "management", "gate_guard"} - {"fleet_manager", "management"},
    # Fleet managers never had the gate screens; gate endpoints are for the gate.
    ("get", "/api/vehicles/by-code/x/"): {"gate_guard"},
    ("post", "/api/vehicles/read-odometer/"): {"gate_guard"},
    # Management has no Requisitions screen.
    ("get", "/api/requisitions/"): {"fleet_manager"},
    # Management already managed alerts (update/dismiss); raising one is part of that.
    ("post", "/api/alerts/"): {"fleet_manager", "management", "gate_guard"},
}

ROLE_NAMES = {"fleet_manager": "Fleet Manager", "management": "Management", "gate_guard": "Gate Guard"}


class LegacyEquivalenceTests(RbacTestCase):
    def test_migrated_roles_reach_what_they_could_before(self):
        users = {key: self.staff(f"u_{key}", name) for key, name in ROLE_NAMES.items()}
        mismatches = []
        for (method, url), legacy in LEGACY_ACCESS.items():
            expected = DELIBERATE_CHANGES.get((method, url), legacy)
            for key, user in users.items():
                self.client.force_authenticate(user=user)
                status = getattr(self.client, method)(url, {}, format="json").status_code
                allowed = status not in (401, 403)
                if allowed != (key in expected):
                    mismatches.append(f"{method.upper()} {url} as {key}: got {status}")
            self.client.force_authenticate(user=self.admin)
            status = getattr(self.client, method)(url, {}, format="json").status_code
            if status in (401, 403):
                mismatches.append(f"{method.upper()} {url} as admin: got {status}")
        self.assertEqual(mismatches, [])

    def test_staff_with_no_role_is_refused_everywhere_but_master_data(self):
        self.client.force_authenticate(user=self.staff("nobody"))
        for (method, url) in LEGACY_ACCESS:
            status = getattr(self.client, method)(url, {}, format="json").status_code
            if (method, url) == ("get", "/api/vehicle-types/"):
                self.assertNotIn(status, (401, 403), url)
            else:
                self.assertEqual(status, 403, f"{method.upper()} {url}")


class RoleAndUserManagementTests(RbacTestCase):
    def test_admin_creates_role_with_implied_views(self):
        response = self.as_user(self.admin).post(
            "/api/auth/roles/", {"name": "Auditor", "permissions": ["drivers.edit", "audit.view"]}, format="json"
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["permissions"], ["audit.view", "drivers.edit", "drivers.view"])

    def test_unknown_permission_is_rejected(self):
        response = self.as_user(self.admin).post(
            "/api/auth/roles/", {"name": "Bad", "permissions": ["drivers.fly"]}, format="json"
        )
        self.assertEqual(response.status_code, 400)

    def test_duplicate_role_name_is_rejected(self):
        response = self.as_user(self.admin).post("/api/auth/roles/", {"name": "gate guard"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_role_in_use_cannot_be_deleted(self):
        self.staff("s1", "Gate Guard")
        role = self.roles["Gate Guard"]
        response = self.as_user(self.admin).delete(f"/api/auth/roles/{role.id}/")
        self.assertEqual(response.status_code, 400)
        self.assertTrue(Role.objects.filter(pk=role.pk).exists())

    def test_admin_creates_staff_with_role_and_direct_permissions(self):
        response = self.as_user(self.admin).post(
            "/api/users/",
            {
                "name": "Sam", "email": "sam@example.test", "password": "pw-123456", "userType": "staff",
                "roleId": str(self.roles["Gate Guard"].id), "directPermissions": ["reports.view"],
            },
            format="json",
        )
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["direct_permissions"], ["reports.view"])
        self.assertIn("gate.exit", response.data["effective_permissions"])
        self.assertIn("reports.view", response.data["effective_permissions"])

    def test_making_someone_admin_clears_role_and_extras(self):
        user = self.staff("s1", "Gate Guard", direct=["reports.view"])
        response = self.as_user(self.admin).patch(f"/api/users/{user.id}/", {"userType": "admin"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        user.refresh_from_db()
        self.assertIsNone(user.role)
        self.assertEqual(user.direct_permissions.count(), 0)

    def test_role_from_another_tenant_cannot_be_assigned(self):
        with self.other_tenant("othertenant2") as other:
            foreign = Role.objects.get(tenant=other, name="Fleet Manager")
            user = self.staff("s1")
            response = self.as_user(self.admin).patch(
                f"/api/users/{user.id}/", {"roleId": str(foreign.id)}, format="json"
            )
            self.assertEqual(response.status_code, 400)

    def test_admin_cannot_demote_or_deactivate_themselves(self):
        client = self.as_user(self.admin)
        self.assertEqual(client.patch(f"/api/users/{self.admin.id}/", {"userType": "staff"}, format="json").status_code, 400)
        self.assertEqual(client.patch(f"/api/users/{self.admin.id}/", {"active": False}, format="json").status_code, 400)
        self.assertEqual(client.delete(f"/api/users/{self.admin.id}/").status_code, 400)

    def test_staff_cannot_manage_users_or_roles_whatever_they_hold(self):
        # Even a staff member holding every permission can't reach these.
        client = self.as_user(self.staff("s1", direct=list(ALL_PERMISSIONS)))
        self.assertEqual(client.get("/api/users/").status_code, 403)
        self.assertEqual(client.post("/api/auth/roles/", {"name": "X"}, format="json").status_code, 403)
        self.assertEqual(client.get("/api/kiosk-devices/").status_code, 403)

    def test_me_returns_effective_permissions(self):
        response = self.as_user(self.staff("s1", "Gate Guard")).get("/api/auth/me/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["user_type"], "staff")
        self.assertEqual(response.data["role_name"], "Gate Guard")
        self.assertEqual(response.data["permissions"], ["gate.entry", "gate.exit", "gate.fuel"])
