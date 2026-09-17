import secrets
import uuid

from django.contrib.auth.models import AbstractUser
from django.db import models
from django.utils import timezone


class Permission(models.Model):
    """One entry of the permission catalog (accounts.permissions_catalog),
    kept in the database so roles and users can reference it. Global, not per
    tenant — the catalog is the same for everyone; what differs is who holds
    what. Synced from the catalog on every migrate."""

    codename = models.CharField(max_length=80, unique=True)
    label = models.CharField(max_length=200)
    group = models.CharField(max_length=80)

    class Meta:
        ordering = ["group", "codename"]

    def __str__(self) -> str:
        return self.codename


class Role(models.Model):
    """A tenant's named bundle of permissions. A staff user has at most one."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="roles")
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, default="")
    permissions = models.ManyToManyField(Permission, related_name="roles", blank=True)
    # Seeded for every tenant (see permissions_catalog.SYSTEM_ROLES). Editable
    # like any other role; the flag only records where it came from.
    is_system = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["name"]
        constraints = [models.UniqueConstraint(fields=["tenant", "name"], name="unique_role_name_per_tenant")]

    def __str__(self) -> str:
        return self.name


class User(AbstractUser):
    """
    The real identity behind what src/hooks/use-session.ts currently fakes —
    that store just holds a freely-settable `role` with no login at all.
    Lives in SHARED_APPS: one shared table platform-wide, not one copy per
    tenant schema — user-based multi-tenancy means the tenant is resolved from
    this row's own `tenant` FK (see accounts.authentication.TenantAwareJWTAuthentication),
    not from which host the request came in on. Isolation for this model is
    therefore an application-code responsibility (every queryset that touches
    it must filter by tenant — see accounts/views.py) rather than a database-
    structural one like the rest of the tenant-scoped apps still get for free.

    Access: an admin can do everything. A staff user can do what their one
    role grants plus any direct permissions — direct permissions only ever
    add, they can't take away anything the role gives.
    """

    class UserType(models.TextChoices):
        ADMIN = "admin"
        STAFF = "staff"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="users")
    email = models.EmailField(unique=True)
    user_type = models.CharField(max_length=10, choices=UserType.choices, default=UserType.STAFF)
    # PROTECT: deleting a role that's still assigned would silently strip
    # those users of access, so the API refuses and says who has it.
    role = models.ForeignKey(Role, null=True, blank=True, on_delete=models.PROTECT, related_name="users")
    direct_permissions = models.ManyToManyField(Permission, related_name="direct_users", blank=True)
    # The pre-RBAC fixed role (admin / fleet_manager / ...), kept only so the
    # migration onto roles can be reversed. Nothing reads it; drop it once
    # the new model has run in production for a while.
    legacy_role = models.CharField(max_length=20, blank=True, default="")
    active = models.BooleanField(default=True)

    @property
    def name(self) -> str:
        return self.get_full_name() or self.username

    @property
    def is_admin(self) -> bool:
        return self.user_type == self.UserType.ADMIN

    def get_effective_permissions(self) -> frozenset[str]:
        """Every permission this user holds. Cached on the instance, which for
        request.user means once per request."""
        cached = getattr(self, "_effective_permissions", None)
        if cached is not None:
            return cached

        from accounts.permissions_catalog import ALL_PERMISSIONS, expand_permissions

        if self.is_admin:
            result = frozenset(ALL_PERMISSIONS)
        else:
            codes = set(self.direct_permissions.values_list("codename", flat=True))
            # A role from another tenant is never honoured, even if one were
            # ever wrongly attached.
            if self.role_id and self.role.tenant_id == self.tenant_id:
                codes |= set(self.role.permissions.values_list("codename", flat=True))
            result = frozenset(expand_permissions(codes))
        self._effective_permissions = result
        return result

    def has_permission(self, codename: str) -> bool:
        return codename in self.get_effective_permissions()

    def has_any_permission(self, codenames) -> bool:
        effective = self.get_effective_permissions()
        return any(c in effective for c in codenames)


def generate_kiosk_key() -> str:
    return secrets.token_hex(32)


class KioskDevice(models.Model):
    """
    A physical gate kiosk (Exit/Entry/Fuel) authenticates as a device, not as
    a user — the guard/driver it scans are data being recorded, not who's
    "logged in" to the API. Checked via the X-Kiosk-Api-Key header by
    KioskDeviceAuthentication below. Same shared-table/tenant-FK shape as User
    (see its docstring) — this app moved to SHARED_APPS wholesale, so isolation
    here is enforced by filtering on `tenant`, not by schema.
    """

    class App(models.TextChoices):
        EXIT = "exit"
        ENTRY = "entry"
        FUEL = "fuel"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tenant = models.ForeignKey("tenants.Tenant", on_delete=models.CASCADE, related_name="kiosk_devices")
    name = models.CharField(max_length=80)
    # Which gate app this key is for. Fixed when the key is minted, so an Exit
    # key cannot be redeemed by the Fuel app even on the same tablet. Blank only
    # for keys issued before binding existed; those can no longer authenticate
    # and have to be reissued.
    app = models.CharField(max_length=6, choices=App.choices, blank=True, default="")
    api_key = models.CharField(max_length=64, unique=True, editable=False, default=generate_kiosk_key)
    active = models.BooleanField(default=True)

    # A key is claimed exactly once. The claiming install generates a random id,
    # stores it, and sends it with every request; anything else presenting this
    # key is refused — a different phone, or the same phone's other app, since
    # each app is a separate origin with its own storage. Losing that id is
    # therefore permanent by design: the device needs a newly issued key.
    # Explicit default=None, not just null=True: an untouched CharField's
    # implicit default is "" (empty string), not NULL, even when null=True is
    # set. Without this, every newly created device would get installation_id
    # = "" and the second device ever created would collide on the unique
    # constraint — two rows can share NULL under it, but not two empty strings.
    installation_id = models.CharField(max_length=64, null=True, blank=True, unique=True, default=None)
    claimed_at = models.DateTimeField(null=True, blank=True)
    # What the claiming browser reported about itself — for telling tablets
    # apart in the admin list. Descriptive only; never used for authentication.
    device_label = models.CharField(max_length=120, blank=True, default="")

    last_seen_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    @property
    def claimed(self) -> bool:
        return self.installation_id is not None

    def __str__(self) -> str:
        return f"{self.name} ({self.get_app_display()})"

    def touch(self) -> None:
        self.last_seen_at = timezone.now()
        self.save(update_fields=["last_seen_at"])
