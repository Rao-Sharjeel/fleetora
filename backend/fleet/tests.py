from datetime import timedelta

from django.test import SimpleTestCase
from django.utils import timezone

from common.testing import TenantAPITestCase
from fleet.models import Driver, Trip, Vehicle
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
