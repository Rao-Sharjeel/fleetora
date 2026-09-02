import uuid

from django.contrib.postgres.fields import ArrayField
from django.db import models


class MaintenanceRecord(models.Model):
    class Category(models.TextChoices):
        ENGINE = "engine"
        TRANSMISSION = "transmission"
        BRAKES = "brakes"
        SUSPENSION = "suspension"
        ELECTRICAL = "electrical"
        AC = "ac"
        TYRES = "tyres"
        OTHER = "other"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey("fleet.Vehicle", on_delete=models.CASCADE, related_name="maintenance_records")
    date = models.DateField()
    odometer = models.PositiveIntegerField()
    # Free text on purpose — an external garage isn't a Fleetora user.
    workshop = models.CharField(max_length=120)
    categories = ArrayField(models.CharField(max_length=15, choices=Category.choices), size=8)
    total_cost = models.DecimalField(max_digits=12, decimal_places=2)
    next_due_odometer = models.PositiveIntegerField(null=True, blank=True)
    next_due_date = models.DateField(null=True, blank=True)
    remarks = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-date"]

    def __str__(self) -> str:
        return f"{self.vehicle_id} — {self.date}"


class Tyre(models.Model):
    class Status(models.TextChoices):
        IN_USE = "in_use"
        SPARE = "spare"
        SCRAP = "scrap"
        STORE = "store"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    tyre_code = models.CharField(max_length=30, unique=True)
    brand = models.CharField(max_length=60)
    size = models.CharField(max_length=40)
    serial_number = models.CharField(max_length=60)
    vehicle = models.ForeignKey(
        "fleet.Vehicle", null=True, blank=True, on_delete=models.SET_NULL, related_name="tyres"
    )
    wheel_position = models.CharField(max_length=40, blank=True, default="")
    install_date = models.DateField(null=True, blank=True)
    install_odometer = models.PositiveIntegerField(null=True, blank=True)
    expected_life_km = models.PositiveIntegerField()
    status = models.CharField(max_length=10, choices=Status.choices, default=Status.STORE)

    class Meta:
        ordering = ["tyre_code"]
        constraints = [
            # A tyre can only be fitted to one vehicle at a time. The mock layer
            # never enforced this (it had no tyre writes at all), but it's a
            # correctness bug waiting to happen once fitting is a real operation.
            models.UniqueConstraint(
                fields=["vehicle", "wheel_position"],
                condition=models.Q(status="in_use"),
                name="unique_in_use_tyre_per_wheel_position",
            )
        ]

    def __str__(self) -> str:
        return f"{self.tyre_code} ({self.brand})"
