import base64
import binascii
import uuid

from django.utils import timezone
from rest_framework import serializers

from common.serializers import Base64ImageField, SafePrimaryKeyRelatedField
from fleet.models import Driver, FuelEntry, Guard, OdometerIssue, Trip, Vehicle, VehiclePhoto
from masterdata.models import GateMaster


class VehiclePhotoListField(serializers.ListField):
    """The vehicle gallery, in one field.

    Reads as a list of `{"id", "url"}`. Writes as the full desired list, where
    each entry is either an existing photo's id (keep it, at that position) or
    a base64 data URL (a newly captured image). Anything not named is deleted,
    so one PATCH covers add, remove and reorder.
    """

    child = serializers.CharField()

    def __init__(self, **kwargs):
        kwargs.setdefault("max_length", VehiclePhoto.MAX_PER_VEHICLE)
        kwargs.setdefault(
            "error_messages",
            {"max_length": f"A vehicle can have at most {VehiclePhoto.MAX_PER_VEHICLE} photos."},
        )
        super().__init__(**kwargs)

    def get_attribute(self, instance):
        return instance

    def to_representation(self, vehicle):
        request = self.context.get("request")
        photos = []
        for photo in vehicle.photos.all():
            url = photo.image.url
            photos.append({"id": str(photo.id), "url": request.build_absolute_uri(url) if request else url})
        return photos

    def to_internal_value(self, data):
        entries = super().to_internal_value(data)
        decoder = Base64ImageField()
        resolved = []
        for entry in entries:
            # An existing photo is referenced by its id; anything else has to be
            # a fresh capture, which Base64ImageField turns into a file.
            if _looks_like_uuid(entry):
                resolved.append(("keep", entry))
            else:
                resolved.append(("new", decoder.to_internal_value(entry)))
        return resolved


def _looks_like_uuid(value: str) -> bool:
    try:
        uuid.UUID(value)
    except (ValueError, AttributeError, TypeError):
        return False
    return True


class VehicleSerializer(serializers.ModelSerializer):
    # DRF's default FK field name is `assigned_driver` (-> camelCase `assignedDriver`),
    # but the TS contract is `assignedDriverId` — same story for photo -> photoUrl below.
    # Declared explicitly everywhere a plain ModelSerializer field wouldn't match src/types/index.ts.
    assigned_driver_id = SafePrimaryKeyRelatedField(
        source="assigned_driver", queryset=Driver.objects.all(), required=False, allow_null=True
    )
    photos = VehiclePhotoListField(required=False)
    photo_url = serializers.SerializerMethodField()
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
            "photos",
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

    def get_photo_url(self, obj: Vehicle) -> str | None:
        """The first gallery photo, kept so anything wanting a single
        thumbnail for a vehicle doesn't have to reach into the list."""
        photo = obj.photos.first()
        if not photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(photo.image.url) if request else photo.image.url

    def create(self, validated_data):
        photos = validated_data.pop("photos", None)
        vehicle = super().create(validated_data)
        if photos:
            self._sync_photos(vehicle, photos)
        return vehicle

    def update(self, instance, validated_data):
        # A missing key means "leave the gallery alone"; an empty list means
        # "remove every photo", so the two can't be collapsed.
        photos = validated_data.pop("photos", None)
        vehicle = super().update(instance, validated_data)
        if photos is not None:
            self._sync_photos(vehicle, photos)
        return vehicle

    @staticmethod
    def _sync_photos(vehicle: Vehicle, entries: list[tuple[str, object]]) -> None:
        kept_ids = [value for kind, value in entries if kind == "keep"]
        vehicle.photos.exclude(id__in=kept_ids).delete()

        existing = {str(photo.id): photo for photo in vehicle.photos.all()}
        for position, (kind, value) in enumerate(entries):
            if kind == "keep":
                photo = existing.get(value)
                if photo and photo.position != position:
                    photo.position = position
                    photo.save(update_fields=["position"])
            else:
                VehiclePhoto.objects.create(vehicle=vehicle, image=value, position=position)


class DriverSerializer(serializers.ModelSerializer):
    assigned_vehicle_id = SafePrimaryKeyRelatedField(
        source="assigned_vehicle", queryset=Vehicle.objects.all(), required=False, allow_null=True
    )
    photo_url = Base64ImageField(source="photo", required=False, allow_null=True)

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
    photo_url = Base64ImageField(source="photo", required=False, allow_null=True)
    assigned_gate_id = SafePrimaryKeyRelatedField(
        source="assigned_gate", queryset=GateMaster.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Guard
        fields = [
            "id",
            "guard_id",
            "name",
            "company_id_code",
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


class VehicleListSerializer(VehicleSerializer):
    """Vehicle without its gallery, for the list endpoint — see
    `VehicleViewSet.get_serializer_class` for why."""

    class Meta(VehicleSerializer.Meta):
        fields = [f for f in VehicleSerializer.Meta.fields if f not in ("photos", "photo_url")]


class TripSerializer(serializers.ModelSerializer):
    """The read shape for a trip, at any stage from planned to cancelled. Not
    used to accept writes any more — planning, editing and confirming an exit
    each have their own input shape (TripPlanSerializer, GateOutSerializer)
    because they take different fields and different rules apply; TripViewSet
    calls those directly and returns this serializer's view of the result."""

    vehicle_id = SafePrimaryKeyRelatedField(source="vehicle", queryset=Vehicle.objects.all())
    driver_id = SafePrimaryKeyRelatedField(source="driver", queryset=Driver.objects.all())
    guard_id = SafePrimaryKeyRelatedField(
        source="guard", queryset=Guard.objects.all(), required=False, allow_null=True
    )
    trip_duration_status = serializers.SerializerMethodField()
    # A planned trip past its planned date without leaving isn't a status
    # stored on the row — the gate and the admin list both derive it from
    # today's date on read, so nothing has to sweep expired plans. See
    # GateOutSerializer for the gate side of this same rule.
    effective_status = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    # Denormalized for the kiosk and the admin trip list, which both show
    # "assigned to X" without wanting a second round trip just for a name.
    driver_name = serializers.SerializerMethodField()
    vehicle_registration_number = serializers.SerializerMethodField()

    class Meta:
        model = Trip
        fields = [
            "id",
            "trip_number",
            "vehicle_id",
            "vehicle_registration_number",
            "driver_id",
            "driver_name",
            "guard_id",
            "purpose",
            "destination",
            "requested_by",
            "department",
            "approved_by",
            "created_by_name",
            "planned_out_time",
            "out_time",
            "in_time",
            "odometer_out",
            "odometer_in",
            "trip_km",
            "status",
            "effective_status",
            "return_condition",
            "remarks",
            "expected_return",
            "cancelled_at",
            "cancel_reason",
            "trip_duration_status",
        ]
        # Every field is read-only: TripViewSet never hands request data
        # straight to this serializer (see the class docstring above).
        read_only_fields = [f for f in fields if f != "effective_status" and f != "trip_duration_status"]

    def get_trip_duration_status(self, obj: Trip) -> str:
        """Mirrors trips.service.ts's tripDurationStatus — pure, never stored."""
        if obj.status != Trip.Status.OPEN:
            return "normal"
        if obj.expected_return and timezone.now() > obj.expected_return:
            return "overdue"
        minutes_out = (timezone.now() - obj.out_time).total_seconds() / 60
        if minutes_out > 240:
            return "expected_soon"
        return "normal"

    def get_effective_status(self, obj: Trip) -> str:
        if (
            obj.status == Trip.Status.PLANNED
            and obj.planned_out_time
            and obj.planned_out_time.date() < timezone.localdate()
        ):
            return "expired"
        return obj.status

    def get_created_by_name(self, obj: Trip) -> str:
        return obj.created_by.name if obj.created_by_id else ""

    def get_driver_name(self, obj: Trip) -> str:
        return obj.driver.name

    def get_vehicle_registration_number(self, obj: Trip) -> str:
        return obj.vehicle.registration_number


class SetAllowedToExitSerializer(serializers.Serializer):
    allowed = serializers.BooleanField()
    reason = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        if not attrs["allowed"] and not attrs.get("reason"):
            raise serializers.ValidationError(
                "A reason is required when marking a vehicle not allowed to exit."
            )
        return attrs


class ReadOdometerSerializer(serializers.Serializer):
    """Input for VehicleViewSet.read_odometer — a base64 data URL or bare
    base64 string of the captured (ideally already cropped) odometer photo."""

    image = serializers.CharField()

    def validate_image(self, value):
        # Kiosk sends canvas.toDataURL() output, which includes the
        # "data:image/jpeg;base64," prefix — strip it if present.
        if "," in value and value.strip().lower().startswith("data:"):
            value = value.split(",", 1)[1]
        try:
            return base64.b64decode(value, validate=True)
        except (binascii.Error, ValueError):
            raise serializers.ValidationError("Not valid base64 image data.")


class TripPlanSerializer(serializers.Serializer):
    """Input for planning a trip (POST/PATCH /trips/) — the Transport Incharge
    authorizing a vehicle+driver combination before anyone reaches the gate.
    Distinct from TripSerializer (the read shape) and from GateOutSerializer
    (which only confirms a plan already made); this is the one place a trip's
    who/why/where get written down.

    `instance` is the Trip being edited, when this is used for an update —
    its own vehicle/driver/date are excluded from the double-booking checks
    below so re-saving a plan unchanged doesn't collide with itself.
    """

    vehicle_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    purpose = serializers.CharField()
    destination = serializers.CharField()
    requested_by = serializers.CharField()
    department = serializers.CharField()
    planned_out_time = serializers.DateTimeField()
    expected_return = serializers.DateTimeField(required=False, allow_null=True)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        editing = self.instance

        # A PATCH only sends the fields that changed; anything missing falls
        # back to what the trip already has, so re-checking a plan against
        # itself uses its real, current vehicle/driver/date throughout.
        vehicle_id = attrs.get("vehicle_id", editing.vehicle_id if editing else None)
        driver_id = attrs.get("driver_id", editing.driver_id if editing else None)
        planned_out_time = attrs.get("planned_out_time", editing.planned_out_time if editing else None)

        try:
            vehicle = Vehicle.objects.get(id=vehicle_id)
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError({"vehicle_id": "Vehicle not found."})
        try:
            driver = Driver.objects.get(id=driver_id)
        except Driver.DoesNotExist:
            raise serializers.ValidationError({"driver_id": "Driver not found."})

        if not vehicle.allowed_to_exit:
            reason = f" ({vehicle.allowed_to_exit_reason})" if vehicle.allowed_to_exit_reason else ""
            raise serializers.ValidationError(
                {"vehicle_id": f"{vehicle.registration_number} is blocked from exiting{reason}."}
            )

        planned_date = planned_out_time.date()

        vehicle_trips = Trip.objects.filter(vehicle=vehicle).exclude(
            status__in=(Trip.Status.COMPLETED, Trip.Status.CANCELLED)
        )
        driver_trips = Trip.objects.filter(driver=driver).exclude(
            status__in=(Trip.Status.COMPLETED, Trip.Status.CANCELLED)
        )
        if editing is not None:
            vehicle_trips = vehicle_trips.exclude(pk=editing.pk)
            driver_trips = driver_trips.exclude(pk=editing.pk)

        if vehicle_trips.filter(status=Trip.Status.OPEN).exists():
            raise serializers.ValidationError({"vehicle_id": f"{vehicle.registration_number} is currently out."})
        if vehicle_trips.filter(status=Trip.Status.PLANNED, planned_out_time__date=planned_date).exists():
            raise serializers.ValidationError(
                {"vehicle_id": f"{vehicle.registration_number} already has a planned trip that day."}
            )
        if driver_trips.filter(status=Trip.Status.OPEN).exists():
            raise serializers.ValidationError({"driver_id": f"{driver.name} is currently out on a trip."})
        if driver_trips.filter(status=Trip.Status.PLANNED, planned_out_time__date=planned_date).exists():
            raise serializers.ValidationError({"driver_id": f"{driver.name} already has a planned trip that day."})

        attrs["vehicle"] = vehicle
        attrs["driver"] = driver
        return attrs


class GateOutSerializer(serializers.Serializer):
    """Confirms a planned trip at the gate. The trip itself — vehicle, driver,
    purpose, destination — was already decided when the Transport Incharge
    planned it (TripPlanSerializer); this only records that the vehicle
    actually left, with the odometer reading and the guard on duty.

    Only today's plan for this vehicle is honoured — see Trip.planned_out_time
    and TripSerializer.get_effective_status for the same rule read back to the
    admin app. A plan for another day isn't rejected outright so much as it
    simply isn't found; the distinct "has expired" message below only fires
    when there's something to tell the guard apart from "never planned".
    """

    vehicle_id = serializers.UUIDField()
    driver_id = serializers.UUIDField()
    guard_id = serializers.UUIDField(required=False, allow_null=True)
    # Optional only in exchange for a photo: a guard who cannot get a reading
    # raises an issue instead, and an admin enters it from the image later.
    odometer_out = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    odometer_issue_photo = Base64ImageField(required=False, allow_null=True)
    odometer_issue_attempts = serializers.IntegerField(min_value=0, required=False, default=0)

    def validate(self, attrs):
        try:
            vehicle = Vehicle.objects.select_for_update().get(id=attrs["vehicle_id"])
        except Vehicle.DoesNotExist:
            raise serializers.ValidationError({"vehicle_id": "Vehicle not found."})

        if vehicle.status == Vehicle.Status.OUTSIDE:
            raise serializers.ValidationError(
                f"{vehicle.registration_number} is already outside. Gate-Out is blocked."
            )

        today = timezone.localdate()
        trip = (
            Trip.objects.select_for_update()
            .filter(vehicle=vehicle, status=Trip.Status.PLANNED, planned_out_time__date=today)
            .order_by("planned_out_time")
            .first()
        )
        if trip is None:
            if Trip.objects.filter(vehicle=vehicle, status=Trip.Status.PLANNED).exists():
                raise serializers.ValidationError(
                    {
                        "vehicle_id": "The planned trip for this vehicle has expired. "
                        "Ask the Transport Incharge to plan a new one."
                    }
                )
            raise serializers.ValidationError(
                {"vehicle_id": "No trip is authorized for this vehicle. Ask the Transport Incharge to plan one."}
            )

        if str(trip.driver_id) != str(attrs["driver_id"]):
            raise serializers.ValidationError(
                {"driver_id": f"This trip is assigned to {trip.driver.name}, not the scanned driver."}
            )

        odometer = attrs.get("odometer_out")
        if odometer is None:
            if not attrs.get("odometer_issue_photo"):
                raise serializers.ValidationError(
                    {"odometer_out": "Provide a reading, or a photo of the odometer to be resolved later."}
                )
        elif odometer < vehicle.current_odometer:
            raise serializers.ValidationError(
                f"Odometer OUT ({odometer}) is below the last validated reading "
                f"({vehicle.current_odometer}). Authorized override required."
            )

        attrs["vehicle"] = vehicle
        attrs["trip"] = trip
        return attrs


class GateInSerializer(serializers.Serializer):
    """Mirrors trips.service.ts completeGateIn: requires an open trip, rejects odometer regression.
    Expects `vehicle` (already locked via select_for_update by the caller) in context."""

    odometer_in = serializers.IntegerField(min_value=0, required=False, allow_null=True)
    odometer_issue_photo = Base64ImageField(required=False, allow_null=True)
    odometer_issue_attempts = serializers.IntegerField(min_value=0, required=False, default=0)
    return_condition = serializers.ChoiceField(choices=Trip.ReturnCondition.choices)
    remarks = serializers.CharField(required=False, allow_blank=True, default="")

    def validate(self, attrs):
        vehicle = self.context["vehicle"]
        trip = Trip.objects.select_for_update().filter(vehicle=vehicle, status=Trip.Status.OPEN).first()
        if not trip:
            raise serializers.ValidationError("No open trip found for this vehicle.")
        odometer = attrs.get("odometer_in")
        if odometer is None:
            if not attrs.get("odometer_issue_photo"):
                raise serializers.ValidationError(
                    {"odometer_in": "Provide a reading, or a photo of the odometer to be resolved later."}
                )
        # trip.odometer_out is null when the opening reading is itself still
        # awaiting an admin, so there is nothing to compare against yet.
        elif trip.odometer_out is not None and odometer < trip.odometer_out:
            raise serializers.ValidationError(
                f"Closing odometer ({odometer}) cannot be below opening odometer "
                f"({trip.odometer_out})."
            )
        attrs["trip"] = trip
        return attrs


class FuelEntrySerializer(serializers.ModelSerializer):
    odometer_issue_photo = Base64ImageField(required=False, allow_null=True, write_only=True)
    odometer_issue_attempts = serializers.IntegerField(min_value=0, required=False, default=0, write_only=True)

    vehicle_id = SafePrimaryKeyRelatedField(source="vehicle", queryset=Vehicle.objects.all())
    driver_id = SafePrimaryKeyRelatedField(source="driver", queryset=Driver.objects.all())

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
            "odometer_issue_photo",
            "odometer_issue_attempts",
        ]
        # total is derived server-side from litres x rate, never accepted from a client.
        read_only_fields = ["id", "total"]

    def validate(self, attrs):
        if attrs.get("odometer") is None and not attrs.get("odometer_issue_photo"):
            raise serializers.ValidationError(
                {"odometer": "Provide a reading, or a photo of the odometer to be resolved later."}
            )
        return attrs

    def create(self, validated_data):
        photo = validated_data.pop("odometer_issue_photo", None)
        attempts = validated_data.pop("odometer_issue_attempts", 0)
        entry = super().create(validated_data)
        if photo is not None:
            # Same contract as the gate flows: the reading stays empty and an
            # admin fills it in from the photo.
            OdometerIssue.objects.create(
                vehicle=entry.vehicle,
                fuel_entry=entry,
                stage=OdometerIssue.Stage.FUEL,
                photo=photo,
                attempts=attempts,
            )
        return entry


class OdometerIssueSerializer(serializers.ModelSerializer):
    """An unreadable odometer awaiting an admin's reading."""

    vehicle_id = serializers.UUIDField(source="vehicle.id", read_only=True)
    registration_number = serializers.CharField(source="vehicle.registration_number", read_only=True)
    trip_number = serializers.CharField(source="trip.trip_number", read_only=True, default=None)
    raised_by_name = serializers.CharField(source="raised_by.name", read_only=True, default=None)
    resolved_by_name = serializers.CharField(source="resolved_by.name", read_only=True, default=None)
    photo_url = serializers.SerializerMethodField()
    last_known_odometer = serializers.IntegerField(source="vehicle.current_odometer", read_only=True)

    class Meta:
        model = OdometerIssue
        fields = [
            "id",
            "vehicle_id",
            "registration_number",
            "trip_number",
            "stage",
            "photo_url",
            "attempts",
            "raised_by_name",
            "raised_at",
            "status",
            "reading",
            "resolved_by_name",
            "resolved_at",
            "last_known_odometer",
        ]
        read_only_fields = fields

    def get_photo_url(self, obj: OdometerIssue) -> str | None:
        if not obj.photo:
            return None
        request = self.context.get("request")
        return request.build_absolute_uri(obj.photo.url) if request else obj.photo.url


class ResolveOdometerIssueSerializer(serializers.Serializer):
    """The reading an admin types in from the photo."""

    reading = serializers.IntegerField(min_value=0)

    def validate_reading(self, value):
        issue: OdometerIssue = self.context["issue"]
        if issue.status == OdometerIssue.Status.RESOLVED:
            raise serializers.ValidationError("This reading has already been resolved.")

        # The same monotonicity the gate enforces — a corrected reading still
        # can't sit below what the vehicle had already travelled.
        floor = issue.vehicle.current_odometer
        if issue.stage == OdometerIssue.Stage.GATE_IN and issue.trip and issue.trip.odometer_out is not None:
            floor = max(floor, issue.trip.odometer_out)
        if value < floor:
            raise serializers.ValidationError(
                f"{value} is below the vehicle's last recorded reading ({floor})."
            )
        return value
