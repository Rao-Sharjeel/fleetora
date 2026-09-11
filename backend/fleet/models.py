import uuid

from django.conf import settings
from django.db import connection, models
from django.dispatch import receiver
from django.utils import timezone

from common.models import Sequence


def driver_photo_path(instance, filename):
    # B2 is one shared bucket across every tenant — prefix by schema so
    # tenants' photos can never collide or be listed together.
    return f"drivers/{connection.schema_name}/{instance.id}/{filename}"


def guard_photo_path(instance, filename):
    return f"guards/{connection.schema_name}/{instance.id}/{filename}"


def vehicle_photo_path(instance, filename):
    return f"vehicles/{connection.schema_name}/{instance.vehicle_id}/{filename}"


def odometer_issue_photo_path(instance, filename):
    return f"odometer-issues/{connection.schema_name}/{instance.vehicle_id}/{filename}"


class Driver(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"
        INACTIVE = "inactive"

    class Gender(models.TextChoices):
        MALE = "Male"
        FEMALE = "Female"
        OTHER = "Other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    employee_id = models.CharField(max_length=20, unique=True, editable=False)
    name = models.CharField(max_length=120)
    photo = models.ImageField(upload_to=driver_photo_path, null=True, blank=True)
    company_id_code = models.CharField(max_length=40, unique=True)
    cnic = models.CharField(max_length=20)
    mobile = models.CharField(max_length=20)
    licence_number = models.CharField(max_length=40)
    licence_category = models.CharField(max_length=20)
    licence_expiry = models.DateField()
    department = models.CharField(max_length=120)
    assigned_vehicle = models.ForeignKey(
        "fleet.Vehicle", null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    emergency_contact = models.CharField(max_length=40, blank=True, default="")
    father_husband_name = models.CharField(max_length=120, blank=True, default="")
    date_of_birth = models.DateField(null=True, blank=True)
    gender = models.CharField(max_length=10, choices=Gender.choices, blank=True, default="")
    residential_address = models.TextField(blank=True, default="")
    date_of_joining = models.DateField(null=True, blank=True)
    total_experience_years = models.PositiveSmallIntegerField(null=True, blank=True)
    access_level = models.CharField(max_length=40, blank=True, default="")
    uniform_issued = models.BooleanField(default=False)
    id_card_issued = models.BooleanField(default=False)
    rfid_access_card = models.BooleanField(default=False)
    night_duty_allowed = models.BooleanField(default=False)

    def save(self, *args, **kwargs):
        if not self.employee_id:
            self.employee_id = f"EMP-{100 + Sequence.next('driver_employee_id', 0)}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.employee_id} — {self.name}"


class Guard(models.Model):
    class Status(models.TextChoices):
        ACTIVE = "active"
        INACTIVE = "inactive"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    guard_id = models.CharField(max_length=20, unique=True)  # user-supplied at creation, not generated
    name = models.CharField(max_length=120)
    company_id_code = models.CharField(max_length=40, unique=True)
    cnic = models.CharField(max_length=20)
    mobile = models.CharField(max_length=20)
    department = models.CharField(max_length=120, blank=True, default="")
    assigned_gate = models.ForeignKey(
        "masterdata.GateMaster", null=True, blank=True, on_delete=models.SET_NULL, related_name="guards"
    )
    duty_shift = models.CharField(max_length=80, blank=True, default="")
    guard_type = models.CharField(max_length=60)
    authorized_exit = models.BooleanField(default=True)
    authorized_in = models.BooleanField(default=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.ACTIVE)
    photo = models.ImageField(upload_to=guard_photo_path, null=True, blank=True)

    def __str__(self) -> str:
        return f"{self.guard_id} — {self.name}"


class Vehicle(models.Model):
    class Status(models.TextChoices):
        AVAILABLE = "available"
        OUTSIDE = "outside"
        WORKSHOP = "workshop"
        INACTIVE = "inactive"

    class FuelType(models.TextChoices):
        PETROL = "petrol"
        DIESEL = "diesel"
        OTHER = "other"

    class Transmission(models.TextChoices):
        MANUAL = "manual"
        AUTOMATIC = "automatic"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    internal_id = models.CharField(max_length=20, unique=True, editable=False)
    registration_number = models.CharField(max_length=32, unique=True)
    company = models.CharField(max_length=120)
    make = models.CharField(max_length=80)
    model = models.CharField(max_length=80)
    variant = models.CharField(max_length=80, blank=True, default="")
    year = models.PositiveIntegerField()
    colour = models.CharField(max_length=40)
    fuel_type = models.CharField(max_length=10, choices=FuelType.choices)
    engine_number = models.CharField(max_length=80, blank=True, default="")
    chassis_number = models.CharField(max_length=80, blank=True, default="")
    department_cost_centre = models.CharField(max_length=120, blank=True, default="")
    assigned_driver = models.ForeignKey(
        Driver, null=True, blank=True, on_delete=models.SET_NULL, related_name="assigned_vehicle_of"
    )
    expected_fuel_average_kmpl = models.FloatField()
    current_odometer = models.PositiveIntegerField()
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.AVAILABLE)
    qr_code = models.CharField(max_length=30, unique=True, editable=False)
    seating_capacity = models.PositiveSmallIntegerField(null=True, blank=True)
    transmission = models.CharField(max_length=10, choices=Transmission.choices, blank=True, default="")
    drive_type = models.CharField(max_length=20, blank=True, default="")
    body_type = models.CharField(max_length=40, blank=True, default="")
    fuel_average_alert_low = models.FloatField(null=True, blank=True)
    fuel_average_alert_high = models.FloatField(null=True, blank=True)
    oil_change_km = models.PositiveIntegerField(null=True, blank=True)
    tyre_change_km = models.PositiveIntegerField(null=True, blank=True)
    fuel_filter_change_km = models.PositiveIntegerField(null=True, blank=True)
    gear_oil_change_km = models.PositiveIntegerField(null=True, blank=True)
    timing_belt_change_km = models.PositiveIntegerField(null=True, blank=True)

    allowed_to_exit = models.BooleanField(default=True)
    allowed_to_exit_reason = models.CharField(max_length=255, blank=True, default="")
    allowed_to_exit_updated_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    allowed_to_exit_updated_at = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.internal_id:
            self.internal_id = f"VEH-{Sequence.next('vehicle_internal_id', 0):03d}"
        if not self.qr_code:
            self.qr_code = f"QR-{self.internal_id}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.registration_number} ({self.internal_id})"


class VehiclePhoto(models.Model):
    """One of up to MAX_PER_VEHICLE photos of a vehicle.

    Unlike driver/guard headshots these are not cropped to a square — a vehicle
    is photographed from whatever angle and aspect ratio the camera gives.
    """

    MAX_PER_VEHICLE = 5

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="photos")
    image = models.ImageField(upload_to=vehicle_photo_path)
    # Display order in the gallery; the first photo doubles as the vehicle's
    # thumbnail wherever a single image is needed.
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["position", "created_at"]

    def __str__(self) -> str:
        return f"Photo {self.position} of {self.vehicle_id}"


@receiver(models.signals.post_delete, sender=VehiclePhoto)
def delete_vehicle_photo_file(sender, instance, **kwargs):
    """Swapping a vehicle's photos is routine, so the replaced files would pile
    up in the bucket forever if the row's deletion didn't take the file with it.
    `save=False` because the row is already gone.
    """
    if instance.image:
        instance.image.delete(save=False)


class Trip(models.Model):
    class Status(models.TextChoices):
        OPEN = "open"
        COMPLETED = "completed"

    class ReturnCondition(models.TextChoices):
        OK = "ok"
        MAINTENANCE_REQUIRED = "maintenance_required"
        DAMAGE_INCIDENT = "damage_incident"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    trip_number = models.CharField(max_length=30, unique=True, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="trips")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="trips")
    guard = models.ForeignKey(Guard, null=True, blank=True, on_delete=models.SET_NULL, related_name="trips")
    purpose = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    # Free text on purpose — the requester/approver is often not a Fleetora
    # login at all (a department head, entered on their behalf).
    requested_by = models.CharField(max_length=120)
    department = models.CharField(max_length=120)
    approved_by = models.CharField(max_length=120, blank=True, default="")
    out_time = models.DateTimeField()
    in_time = models.DateTimeField(null=True, blank=True)
    # Nullable because a guard can report an unreadable odometer instead of
    # entering a number: the trip proceeds and an admin fills the reading in
    # from the photo. Storing the vehicle's last reading as a stand-in would
    # look like a real measurement in every report that touched it.
    odometer_out = models.PositiveIntegerField(null=True, blank=True)
    odometer_in = models.PositiveIntegerField(null=True, blank=True)
    trip_km = models.PositiveIntegerField(null=True, blank=True)
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.OPEN)
    return_condition = models.CharField(max_length=25, choices=ReturnCondition.choices, blank=True, default="")
    remarks = models.TextField(blank=True, default="")
    expected_return = models.DateTimeField(null=True, blank=True)

    def save(self, *args, **kwargs):
        if not self.trip_number:
            year = (self.out_time or timezone.now()).year
            self.trip_number = f"TRP-{year}-{Sequence.next('trip_number', year):06d}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.trip_number


class OdometerIssue(models.Model):
    """An odometer a guard could not get read, raised for an admin to resolve.

    Guards are not allowed to type readings in themselves — that is the whole
    point of scanning one — so when the OCR keeps failing they photograph the
    cluster and hand it to someone who can enter it from the desk. Until then
    the reading it belongs to stays empty rather than holding a guess.
    """

    class Stage(models.TextChoices):
        GATE_OUT = "gate_out"
        GATE_IN = "gate_in"
        FUEL = "fuel"

    class Status(models.TextChoices):
        PENDING = "pending"
        RESOLVED = "resolved"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name="odometer_issues")
    # Exactly one of these is set, matching `stage`.
    trip = models.ForeignKey("Trip", null=True, blank=True, on_delete=models.CASCADE, related_name="odometer_issues")
    fuel_entry = models.ForeignKey(
        "FuelEntry", null=True, blank=True, on_delete=models.CASCADE, related_name="odometer_issues"
    )
    stage = models.CharField(max_length=10, choices=Stage.choices)
    photo = models.ImageField(upload_to=odometer_issue_photo_path)
    # How many reads the guard tried before giving up — useful for spotting a
    # cluster that always fails, or a device with a bad camera.
    attempts = models.PositiveSmallIntegerField(default=0)
    raised_by = models.ForeignKey(Guard, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    raised_at = models.DateTimeField(auto_now_add=True)

    status = models.CharField(max_length=10, choices=Status.choices, default=Status.PENDING)
    reading = models.PositiveIntegerField(null=True, blank=True)
    resolved_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+"
    )
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ["-raised_at"]

    def __str__(self) -> str:
        return f"{self.get_stage_display()} odometer issue — {self.vehicle_id} ({self.status})"


@receiver(models.signals.post_delete, sender=OdometerIssue)
def delete_odometer_issue_photo(sender, instance, **kwargs):
    if instance.photo:
        instance.photo.delete(save=False)


class FuelEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(Vehicle, on_delete=models.PROTECT, related_name="fuel_entries")
    driver = models.ForeignKey(Driver, on_delete=models.PROTECT, related_name="fuel_entries")
    date_time = models.DateTimeField(default=timezone.now)
    # Nullable for the same reason as Trip.odometer_out: an attendant who can't
    # get a reading raises an issue instead, and it stays empty until resolved.
    odometer = models.PositiveIntegerField(null=True, blank=True)
    fuel_type = models.CharField(max_length=10, choices=Vehicle.FuelType.choices)
    litres = models.DecimalField(max_digits=8, decimal_places=2)
    rate_per_litre = models.DecimalField(max_digits=8, decimal_places=2)
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    fuel_station = models.CharField(max_length=120)
    payment_method = models.CharField(max_length=40)
    receipt_no = models.CharField(max_length=60, blank=True, default="")
    full_tank = models.BooleanField(default=True)

    class Meta:
        ordering = ["-date_time"]
        verbose_name_plural = "fuel entries"

    def save(self, *args, **kwargs):
        # Always recomputed server-side — a client can never submit a total that
        # disagrees with litres x rate.
        self.total = self.litres * self.rate_per_litre
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return f"{self.vehicle_id} — {self.litres}L"
