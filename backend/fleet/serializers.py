from django.utils import timezone
from rest_framework import serializers

from fleet.models import Driver, FuelEntry, Guard, Trip, Vehicle
from masterdata.models import GateMaster


class VehicleSerializer(serializers.ModelSerializer):
    # DRF's default FK field name is `assigned_driver` (-> camelCase `assignedDriver`),
    # but the TS contract is `assignedDriverId` — same story for photo -> photoUrl below.
    # Declared explicitly everywhere a plain ModelSerializer field wouldn't match src/types/index.ts.
    assigned_driver_id = serializers.PrimaryKeyRelatedField(
        source="assigned_driver", queryset=Driver.objects.all(), required=False, allow_null=True
    )
    photo_url = serializers.ImageField(source="photo", required=False, allow_null=True)
    allowed_to_exit_updated_by = serializers.SerializerMethodField()

    class Meta:
        model = Vehicle
        fields = [
            "id",
            "internal_id",
            "registration_number",
            "company",
            "make",
            "model",
            "variant",
            "year",
            "colour",
            "fuel_type",
            "engine_number",
            "chassis_number",
            "department_cost_centre",
            "assigned_driver_id",
            "expected_fuel_average_kmpl",
            "current_odometer",
            "status",
            "photo_url",
            "qr_code",
            "seating_capacity",
            "transmission",
            "drive_type",
            "body_type",
            "fuel_average_alert_low",
            "fuel_average_alert_high",
            "oil_change_km",
            "tyre_change_km",
            "fuel_filter_change_km",
            "gear_oil_change_km",
            "timing_belt_change_km",
            "allowed_to_exit",
            "allowed_to_exit_reason",
            "allowed_to_exit_updated_by",
            "allowed_to_exit_updated_at",
        ]
        read_only_fields = [
            "id",
            "internal_id",
            "qr_code",
            "allowed_to_exit",
            "allowed_to_exit_reason",
            "allowed_to_exit_updated_at",
        ]

    def get_allowed_to_exit_updated_by(self, obj: Vehicle) -> str | None:
        return obj.allowed_to_exit_updated_by.name if obj.allowed_to_exit_updated_by else None


class DriverSerializer(serializers.ModelSerializer):
    assigned_vehicle_id = serializers.PrimaryKeyRelatedField(
        source="assigned_vehicle", queryset=Vehicle.objects.all(), required=False, allow_null=True
    )
    photo_url = serializers.ImageField(source="photo", required=False, allow_null=True)

    class Meta:
        model = Driver
        fields = [
            "id",
            "employee_id",
            "name",
            "photo_url",
            "company_id_code",
            "cnic",
            "mobile",
            "licence_number",
            "licence_category",
            "licence_expiry",
            "department",
            "assigned_vehicle_id",
            "status",
            "emergency_contact",
            "father_husband_name",
            "date_of_birth",
            "gender",
            "residential_address",
            "date_of_joining",
            "total_experience_years",
            "access_level",
            "uniform_issued",
            "id_card_issued",
            "rfid_access_card",
            "night_duty_allowed",
        ]
        read_only_fields = ["id", "employee_id"]


class GuardSerializer(serializers.ModelSerializer):
    photo_url = serializers.ImageField(source="photo", required=False, allow_null=True)
    assigned_gate_id = serializers.PrimaryKeyRelatedField(
        source="assigned_gate", queryset=GateMaster.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Guard
        fields = [
            "id",
            "guard_id",
            "name",
            "cnic",
            "mobile",
            "department",
            "assigned_gate_id",
            "duty_shift",
            "guard_type",
            "authorized_exit",
            "authorized_in",
            "status",
            "photo_url",
        ]
        read_only_fields = ["id"]


class TripSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(source="vehicle", queryset=Vehicle.objects.all())
    driver_id = serializers.PrimaryKeyRelatedField(source="driver", queryset=Driver.objects.all())
    guard_id = serializers.PrimaryKeyRelatedField(
        source="guard", queryset=Guard.objects.all(), required=False, allow_null=True
    )
    trip_duration_status = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "trip_number",
            "vehicle_id",
            "driver_id",
            "guard_id",
            "purpose",
            "destination",
            "requested_by",
            "department",
            "approved_by",
            "out_time",
            "in_time",
            "odometer_out",
            "odometer_in",
            "trip_km",
            "status",
            "return_condition",
            "remarks",
            "expected_return",
            "trip_duration_status",
        ]
        read_only_fields = [
            "id",
            "trip_number",
            "status",
            "in_time",
            "odometer_in",
            "trip_km",
            "return_condition",
        ]

    def get_trip_duration_status(self, obj: Trip) -> str:
        """Mirrors trips.service.ts's tripDurationStatus — pure, never stored."""
        if obj.status == Trip.Status.COMPLETED:
            return "normal"
        if obj.expected_return and timezone.now() > obj.expected_return:
            return "overdue"
        minutes_out = (timezone.now() - obj.out_time).total_seconds() / 60
        if minutes_out > 240:
            return "expected_soon"
        return "normal"


class SetAllowedToExitSerializer(serializers.Serializer):
    allowed = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs["allowed"] and not attrs.get("reason"):
            raise serializers.ValidationError(
                "A reason is required when marking a vehicle not allowed to exit."
            )
        return attrs


class GateOutSerializer(serializers.Serializer):
    """Mirrors trips.service.ts createGateOut: no duplicate active trip, no odometer regression."""

    vehicle_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    guard_id = serializers.UUIDField(required=False, allow_null=True)
    odometer_out = serializers.IntegerField(min_value=0)
    purpose = serializers.CharField()
    destination = serializers.CharField()
    requested_by = serializers.CharField()
    department = serializers.CharField()
    expected_return = serializers.DateTimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        try:
            vehicle = Vehicle.objects.select_for_update().get(id=attrs["vehicle_id"])
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError({"vehicle_id": "Vehicle not found."})

        if vehicle.status == Vehicle.Status.OUTSIDE:
            raise serializers.ValidationError(
                f"{vehicle.registration_number} is already outside. Gate-Out is blocked."
            )
        if attrs["odometer_out"] < vehicle.current_odometer:
            raise serializers.ValidationError(
                f"Odometer OUT ({attrs['odometer_out']}) is below the last validated reading "
                f"({vehicle.current_odometer}). Authorized override required."
            )

        attrs["vehicle"] = vehicle
        return attrs


class GateInSerializer(serializers.Serializer):
    """Mirrors trips.service.ts completeGateIn: requires an open trip, rejects odometer regression.
    Expects `vehicle` (already locked via select_for_update by the caller) in context."""

    odometer_in = serializers.IntegerField(min_value=0)
    return_condition = serializers.ChoiceField(choices=Trip.ReturnCondition.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        vehicle = self.context["vehicle"]
        trip = Trip.objects.select_for_update().filter(vehicle=vehicle, status=Trip.Status.OPEN).first()
        if not trip:
            raise serializers.ValidationError("No open trip found for this vehicle.")
        if attrs["odometer_in"] < trip.odometer_out:
            raise serializers.ValidationError(
                f"Closing odometer ({attrs['odometer_in']}) cannot be below opening odometer "
                f"({trip.odometer_out})."
            )
        attrs["trip"] = trip
        return attrs


class FuelEntrySerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(source="vehicle", queryset=Vehicle.objects.all())
    driver_id = serializers.PrimaryKeyRelatedField(source="driver", queryset=Driver.objects.all())

    class Meta:
        model = FuelEntry
        fields = [
            "id",
            "vehicle_id",
            "driver_id",
            "date_time",
            "odometer",
            "fuel_type",
            "litres",
            "rate_per_litre",
            "total",
            "fuel_station",
            "payment_method",
            "receipt_no",
            "full_tank",
        ]
        # total is derived server-side from litres x rate, never accepted from a client.
        read_only_fields = ["id", "total"]
