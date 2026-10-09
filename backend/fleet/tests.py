from datetime import timedelta
from decimal import Decimal

from django.test import SimpleTestCase
from django.utils import timezone

from accounts.models import KioskDevice, Permission, User
from audit.models import AuditLogEntry
from common.testing import TenantAPITestCase
from fleet.models import Driver, FuelEntry, OdometerIssue, Trip, Vehicle
from fleet.services import choose_reading


class ChooseReadingTests(SimpleTestCase):
    """Voting rules for the odometer OCR fallback.

    Deliberately free of Tesseract and of any system font, so it behaves the
    same on a developer's machine and in the container.
    """

    def test_no_candidates_reads_nothing(self):
        result = choose_reading([])
        self.assertIsNone(result.reading)
        self.assertFalse(result.confident)

    def test_blank_candidates_read_nothing(self):
        self.assertIsNone(choose_reading(["", "", ""]).reading)

    def test_agreement_between_modes_is_confident(self):
        result = choose_reading(["134700", "134700", ""])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_single_mode_reading_is_not_confident(self):
        # One mode finding digits nobody else saw is exactly the case that used
        # to be presented to the operator as a clean read.
        result = choose_reading(["134700", "", ""])
        self.assertEqual(result.reading, "134700")
        self.assertFalse(result.confident)

    def test_majority_wins_over_a_disagreeing_mode(self):
        result = choose_reading(["134700", "134700", "13470"])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_implausible_lengths_are_ignored_when_a_plausible_one_exists(self):
        # "7" and "13470012345" are a partial read and a swept-in trip meter.
        result = choose_reading(["7", "134700", "13470012345", "134700"])
        self.assertEqual(result.reading, "134700")
        self.assertTrue(result.confident)

    def test_only_implausible_readings_are_returned_but_flagged(self):
        # Still worth showing the operator — they can correct it — but never
        # presented as a confident read.
        result = choose_reading(["12", "12", "12"])
        self.assertEqual(result.reading, "12")
        self.assertFalse(result.confident)

    def test_boundary_lengths_count_as_plausible(self):
        self.assertTrue(choose_reading(["1234", "1234"]).confident)
        self.assertTrue(choose_reading(["1234567", "1234567"]).confident)
        self.assertFalse(choose_reading(["123", "123"]).confident)
        self.assertFalse(choose_reading(["12345678", "12345678"]).confident)


class TripPlanningTestCase(TenantAPITestCase):
    """A trip's life now starts in the office: the Transport Incharge plans it
    (vehicle + driver + why), and the gate only ever confirms a plan that
    already exists. See fleet.serializers.TripPlanSerializer/GateOutSerializer.
    """

    def setUp(self):
        super().setUp()
        self.admin = self.make_user("incharge")
        self.vehicle = Vehicle.objects.create(
            registration_number="LEA-1111", company="Head Office", make="Toyota", model="Hilux",
            year=2022, colour="White", fuel_type=Vehicle.FuelType.DIESEL,
            expected_fuel_average_kmpl=10, current_odometer=50000,
        )
        self.driver = Driver.objects.create(
            name="Ali Raza", company_id_code="EMP-CODE-1", cnic="12345-1234567-1", mobile="0300-1234567",
            licence_number="LHR-001", licence_category="LTV", licence_expiry="2030-01-01", department="Sales",
        )
        self.other_driver = Driver.objects.create(
            name="Bilal Khan", company_id_code="EMP-CODE-2", cnic="12345-1234567-2", mobile="0300-1234568",
            licence_number="LHR-002", licence_category="LTV", licence_expiry="2030-01-01", department="Sales",
        )

    def plan_payload(self, **overrides):
        payload = {
            "vehicleId": str(self.vehicle.id),
            "driverId": str(self.driver.id),
            "purpose": "Client visit",
            "destination": "Shah Alam",
            "requestedBy": "Accounts",
            "department": "Sales",
            "plannedOutTime": timezone.now().isoformat(),
        }
        payload.update(overrides)
        return payload

    def test_admin_plans_a_trip(self):
        response = self.as_user(self.admin).post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(response.status_code, 201, response.data)
        self.assertEqual(response.data["status"], "planned")
        self.assertEqual(response.data["effective_status"], "planned")
        self.assertIsNone(response.data["out_time"])
        self.assertEqual(response.data["created_by_name"], self.admin.name)

    def test_planning_a_blocked_vehicle_is_refused(self):
        self.vehicle.allowed_to_exit = False
        self.vehicle.allowed_to_exit_reason = "Overdue service"
        self.vehicle.save(update_fields=["allowed_to_exit", "allowed_to_exit_reason"])
        response = self.as_user(self.admin).post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(response.status_code, 400)

    def test_double_booking_the_same_vehicle_same_day_is_refused(self):
        client = self.as_user(self.admin)
        first = client.post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(first.status_code, 201)
        second = client.post(
            "/api/trips/", self.plan_payload(driverId=str(self.other_driver.id)), format="json"
        )
        self.assertEqual(second.status_code, 400)

    def test_double_booking_the_same_driver_same_day_is_refused(self):
        other_vehicle = Vehicle.objects.create(
            registration_number="LEA-2222", company="Head Office", make="Honda", model="Civic",
            year=2023, colour="Black", fuel_type=Vehicle.FuelType.PETROL,
            expected_fuel_average_kmpl=12, current_odometer=1000,
        )
        client = self.as_user(self.admin)
        first = client.post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(first.status_code, 201)
        second = client.post(
            "/api/trips/", self.plan_payload(vehicleId=str(other_vehicle.id)), format="json"
        )
        self.assertEqual(second.status_code, 400)

    def test_editing_a_planned_trip(self):
        client = self.as_user(self.admin)
        trip_id = client.post("/api/trips/", self.plan_payload(), format="json").data["id"]
        response = client.patch(f"/api/trips/{trip_id}/", {"destination": "Karachi"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["destination"], "Karachi")

    def test_cancelling_a_planned_trip(self):
        client = self.as_user(self.admin)
        trip_id = client.post("/api/trips/", self.plan_payload(), format="json").data["id"]
        response = client.post(f"/api/trips/{trip_id}/cancel/", {"reason": "Trip no longer needed"}, format="json")
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["status"], "cancelled")
        # A cancelled slot frees the vehicle and driver up again the same day.
        again = client.post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(again.status_code, 201, again.data)

    def test_delete_is_refused_in_favour_of_cancel(self):
        client = self.as_user(self.admin)
        trip_id = client.post("/api/trips/", self.plan_payload(), format="json").data["id"]
        response = client.delete(f"/api/trips/{trip_id}/")
        self.assertEqual(response.status_code, 400)

    def test_gate_out_with_no_plan_is_refused(self):
        response = self.as_user(self.admin).post(
            "/api/trips/gate-out/",
            {"vehicleId": str(self.vehicle.id), "driverId": str(self.driver.id), "odometerOut": 50100},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("authorized", str(response.data))

    def test_gate_out_confirms_a_planned_trip(self):
        client = self.as_user(self.admin)
        trip_id = client.post("/api/trips/", self.plan_payload(), format="json").data["id"]
        response = client.post(
            "/api/trips/gate-out/",
            {"vehicleId": str(self.vehicle.id), "driverId": str(self.driver.id), "odometerOut": 50100},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.assertEqual(response.data["id"], trip_id)
        self.assertEqual(response.data["status"], "open")
        self.assertIsNotNone(response.data["out_time"])
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, Vehicle.Status.OUTSIDE)

    def test_gate_out_with_the_wrong_driver_is_refused(self):
        client = self.as_user(self.admin)
        client.post("/api/trips/", self.plan_payload(), format="json")
        response = client.post(
            "/api/trips/gate-out/",
            {"vehicleId": str(self.vehicle.id), "driverId": str(self.other_driver.id), "odometerOut": 50100},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("assigned to", str(response.data))
        self.vehicle.refresh_from_db()
        self.assertEqual(self.vehicle.status, Vehicle.Status.AVAILABLE)

    def test_gate_out_with_yesterdays_plan_is_refused_as_expired(self):
        client = self.as_user(self.admin)
        yesterday = timezone.now() - timedelta(days=1)
        Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, purpose="Old", destination="Old",
            requested_by="Accounts", department="Sales", planned_out_time=yesterday,
            status=Trip.Status.PLANNED, created_by=self.admin,
        )
        response = client.post(
            "/api/trips/gate-out/",
            {"vehicleId": str(self.vehicle.id), "driverId": str(self.driver.id), "odometerOut": 50100},
            format="json",
        )
        self.assertEqual(response.status_code, 400)
        self.assertIn("expired", str(response.data))

    def test_expired_plan_shows_effective_status_expired(self):
        yesterday = timezone.now() - timedelta(days=1)
        trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, purpose="Old", destination="Old",
            requested_by="Accounts", department="Sales", planned_out_time=yesterday,
            status=Trip.Status.PLANNED, created_by=self.admin,
        )
        response = self.as_user(self.admin).get(f"/api/trips/{trip.id}/")
        self.assertEqual(response.data["status"], "planned")
        self.assertEqual(response.data["effective_status"], "expired")

    def test_staff_without_trips_create_cannot_plan(self):
        from accounts.models import User

        staff = self.make_user("clerk", user_type=User.UserType.STAFF)
        response = self.as_user(staff).post("/api/trips/", self.plan_payload(), format="json")
        self.assertEqual(response.status_code, 403)

    def test_for_vehicle_finds_todays_plan(self):
        client = self.as_user(self.admin)
        trip_id = client.post("/api/trips/", self.plan_payload(), format="json").data["id"]
        response = client.get(f"/api/trips/for-vehicle/?vehicle_id={self.vehicle.id}")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["trip"]["id"], trip_id)
        self.assertFalse(response.data["expired"])

    def test_for_vehicle_flags_an_expired_plan(self):
        yesterday = timezone.now() - timedelta(days=1)
        Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, purpose="Old", destination="Old",
            requested_by="Accounts", department="Sales", planned_out_time=yesterday,
            status=Trip.Status.PLANNED, created_by=self.admin,
        )
        response = self.as_user(self.admin).get(f"/api/trips/for-vehicle/?vehicle_id={self.vehicle.id}")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["trip"])
        self.assertTrue(response.data["expired"])

    def test_for_vehicle_with_no_plan_at_all(self):
        response = self.as_user(self.admin).get(f"/api/trips/for-vehicle/?vehicle_id={self.vehicle.id}")
        self.assertEqual(response.status_code, 200)
        self.assertIsNone(response.data["trip"])
        self.assertFalse(response.data["expired"])


class VehicleForceDeleteTests(TenantAPITestCase):
    """DELETE /api/vehicles/<id>/ — blocked while trips/fuel exist unless the
    caller passes ?force=true, which cascades that history away too."""

    def setUp(self):
        super().setUp()
        self.admin = self.make_user("admin1")
        self.vehicle = Vehicle.objects.create(
            registration_number="LEA-3333", company="Head Office", make="Toyota", model="Hilux",
            year=2022, colour="White", fuel_type=Vehicle.FuelType.DIESEL,
            expected_fuel_average_kmpl=10, current_odometer=50000,
        )
        self.driver = Driver.objects.create(
            name="Ali Raza", company_id_code="EMP-CODE-9", cnic="12345-1234567-1", mobile="0300-1234567",
            licence_number="LHR-001", licence_category="LTV", licence_expiry="2030-01-01", department="Sales",
        )
        self.trip = Trip.objects.create(
            vehicle=self.vehicle, driver=self.driver, purpose="Errand", destination="Town",
            requested_by="Accounts", department="Sales", out_time=timezone.now(),
            odometer_out=50000, status=Trip.Status.OPEN,
        )
        self.vehicle.status = Vehicle.Status.OUTSIDE
        self.vehicle.save(update_fields=["status"])

    def test_delete_without_force_is_blocked_with_a_flag(self):
        response = self.as_user(self.admin).delete(f"/api/vehicles/{self.vehicle.id}/")
        self.assertEqual(response.status_code, 400)
        # assertIs, not assertTrue: a plain Response, not ValidationError, so
        # this must be a real bool, not DRF's ValidationError stringifying it
        # to "True" — which the frontend's boolean check would silently miss.
        self.assertIs(response.data["requires_force"], True)
        self.assertIs(response.data["currently_outside"], True)
        self.assertTrue(Vehicle.objects.filter(pk=self.vehicle.pk).exists())

    def test_force_delete_removes_the_vehicle_and_its_trips(self):
        response = self.as_user(self.admin).delete(f"/api/vehicles/{self.vehicle.id}/?force=true")
        self.assertEqual(response.status_code, 204, response.data)
        self.assertFalse(Vehicle.objects.filter(pk=self.vehicle.pk).exists())
        self.assertFalse(Trip.objects.filter(pk=self.trip.pk).exists())

    def test_delete_with_no_history_needs_no_force(self):
        clean = Vehicle.objects.create(
            registration_number="LEA-4444", company="Head Office", make="Honda", model="Civic",
            year=2023, colour="Black", fuel_type=Vehicle.FuelType.PETROL,
            expected_fuel_average_kmpl=12, current_odometer=100,
        )
        response = self.as_user(self.admin).delete(f"/api/vehicles/{clean.id}/")
        self.assertEqual(response.status_code, 204)


class FuelEntryEditDeleteTests(TenantAPITestCase):
    """PATCH/DELETE /api/fuel-entries/<id>/ — the Fuel page's edit and delete,
    gated on fuel.edit / fuel.delete and audited either way."""

    def setUp(self):
        super().setUp()
        self.admin = self.make_user("admin1")
        self.vehicle = Vehicle.objects.create(
            registration_number="LEA-5555", company="Head Office", make="Toyota", model="Corolla",
            year=2021, colour="Silver", fuel_type=Vehicle.FuelType.PETROL,
            expected_fuel_average_kmpl=12, current_odometer=30000,
        )
        self.driver = Driver.objects.create(
            name="Bilal Khan", company_id_code="EMP-CODE-7", cnic="35201-7654321-2", mobile="0301-7654321",
            licence_number="LHR-007", licence_category="LTV", licence_expiry="2031-01-01", department="Logistics",
        )
        self.entry = FuelEntry.objects.create(
            vehicle=self.vehicle, driver=self.driver, odometer=30000,
            fuel_type=Vehicle.FuelType.PETROL, litres=Decimal("40.00"),
            rate_per_litre=Decimal("250.00"), fuel_station="Shell Main", payment_method="Cash",
        )

    def staff(self, username, direct=()):
        user = self.make_user(username, user_type=User.UserType.STAFF)
        user.direct_permissions.set(Permission.objects.filter(codename__in=direct))
        return user

    def test_patching_one_field_does_not_require_resending_the_odometer(self):
        # The serializer's reading-or-photo rule used to fire on every PATCH,
        # which made correcting a typo'd station impossible on its own.
        response = self.as_user(self.admin).patch(
            f"/api/fuel-entries/{self.entry.id}/", {"fuel_station": "Shell Ring Road"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.fuel_station, "Shell Ring Road")
        self.assertEqual(self.entry.odometer, 30000)

    def test_an_entry_with_no_reading_yet_is_still_editable(self):
        pending = FuelEntry.objects.create(
            vehicle=self.vehicle, driver=self.driver, odometer=None,
            fuel_type=Vehicle.FuelType.PETROL, litres=Decimal("10.00"),
            rate_per_litre=Decimal("250.00"), fuel_station="Total", payment_method="Cash",
        )
        response = self.as_user(self.admin).patch(
            f"/api/fuel-entries/{pending.id}/", {"payment_method": "Fuel Card"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_edit_recomputes_total_server_side(self):
        response = self.as_user(self.admin).patch(
            f"/api/fuel-entries/{self.entry.id}/",
            {"litres": "50.00", "rate_per_litre": "260.00", "total": "1"},
            format="json",
        )
        self.assertEqual(response.status_code, 200, response.data)
        self.entry.refresh_from_db()
        self.assertEqual(self.entry.total, Decimal("13000.00"))

    def test_edit_is_audited_with_the_previous_figures(self):
        self.as_user(self.admin).patch(
            f"/api/fuel-entries/{self.entry.id}/", {"litres": "45.00"}, format="json"
        )
        log = AuditLogEntry.objects.filter(transaction__startswith="Fuel entry edited").get()
        self.assertIn("40.00", log.previous_value)
        self.assertIn("45.00", log.new_value)

    def test_delete_removes_the_entry_and_audits_it(self):
        response = self.as_user(self.admin).delete(f"/api/fuel-entries/{self.entry.id}/")
        self.assertEqual(response.status_code, 204)
        self.assertFalse(FuelEntry.objects.filter(pk=self.entry.pk).exists())
        self.assertTrue(AuditLogEntry.objects.filter(transaction__startswith="Fuel entry deleted").exists())

    def test_delete_cascades_an_open_odometer_issue(self):
        issue = OdometerIssue.objects.create(
            vehicle=self.vehicle, fuel_entry=self.entry, stage=OdometerIssue.Stage.FUEL,
        )
        self.as_user(self.admin).delete(f"/api/fuel-entries/{self.entry.id}/")
        self.assertFalse(OdometerIssue.objects.filter(pk=issue.pk).exists())

    def test_staff_needs_fuel_edit_to_patch(self):
        viewer = self.staff("viewer1", direct=["fuel.view"])
        response = self.as_user(viewer).patch(
            f"/api/fuel-entries/{self.entry.id}/", {"litres": "41.00"}, format="json"
        )
        self.assertEqual(response.status_code, 403)

        editor = self.staff("editor1", direct=["fuel.view", "fuel.edit"])
        response = self.as_user(editor).patch(
            f"/api/fuel-entries/{self.entry.id}/", {"litres": "41.00"}, format="json"
        )
        self.assertEqual(response.status_code, 200, response.data)

    def test_staff_needs_fuel_delete_to_destroy(self):
        # fuel.edit alone must not carry delete: correcting a money record and
        # removing one are separate grants in the catalog.
        editor = self.staff("editor2", direct=["fuel.view", "fuel.edit"])
        response = self.as_user(editor).delete(f"/api/fuel-entries/{self.entry.id}/")
        self.assertEqual(response.status_code, 403)
        self.assertTrue(FuelEntry.objects.filter(pk=self.entry.pk).exists())

        remover = self.staff("remover1", direct=["fuel.view", "fuel.delete"])
        response = self.as_user(remover).delete(f"/api/fuel-entries/{self.entry.id}/")
        self.assertEqual(response.status_code, 204)


class KioskCapabilityTests(TenantAPITestCase):
    """A paired device may only call the gate functions its key names.

    Before KioskDevice.apps this was checked when the key was claimed and never
    again, so an Exit key, once paired, could post fuel entries just as well.
    """

    def setUp(self):
        super().setUp()
        self.vehicle = Vehicle.objects.create(
            registration_number="LEA-7777", company="Head Office", make="Suzuki", model="Bolan",
            year=2020, colour="White", fuel_type=Vehicle.FuelType.PETROL,
            expected_fuel_average_kmpl=11, current_odometer=12000,
        )
        self.driver = Driver.objects.create(
            name="Imran Shah", company_id_code="EMP-CODE-3", cnic="35201-1111111-1", mobile="0302-1111111",
            licence_number="LHR-003", licence_category="LTV", licence_expiry="2032-01-01", department="Ops",
        )

    def device(self, apps, installation_id):
        d = KioskDevice.objects.create(tenant=self.tenant, name=f"Phone {installation_id}", apps=apps)
        d.installation_id = installation_id
        d.save(update_fields=["installation_id"])
        return d

    def post_fuel(self, device):
        return self.client.post(
            "/api/fuel-entries/",
            {
                "vehicleId": str(self.vehicle.id),
                "driverId": str(self.driver.id),
                "odometer": 12100,
                "fuelType": "petrol",
                "litres": "20.00",
                "ratePerLitre": "250.00",
                "fuelStation": "Shell",
                "paymentMethod": "Cash",
            },
            format="json",
            HTTP_X_KIOSK_API_KEY=device.api_key,
            HTTP_X_KIOSK_INSTALL_ID=device.installation_id,
        )

    def test_an_exit_only_key_cannot_file_a_fuel_entry(self):
        response = self.post_fuel(self.device(["exit"], "install-exit-only"))
        self.assertEqual(response.status_code, 403, response.data)

    def test_a_key_allowing_fuel_can(self):
        response = self.post_fuel(self.device(["exit", "fuel"], "install-exit-fuel"))
        self.assertEqual(response.status_code, 201, response.data)
