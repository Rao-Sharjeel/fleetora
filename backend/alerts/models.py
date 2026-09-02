import uuid

from django.db import models

from fleet.models import Driver, Vehicle


class Alert(models.Model):
    class AlertType(models.TextChoices):
        MAINTENANCE = "maintenance"
        TYRE = "tyre"
        DOCUMENT = "document"
        FUEL_EXCEPTION = "fuel_exception"
        OVERDUE_RETURN = "overdue_return"
        GATE_EXCEPTION = "gate_exception"

    class Severity(models.TextChoices):
        INFO = "info"
        WARNING = "warning"
        CRITICAL = "critical"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    type = models.CharField(max_length=20, choices=AlertType.choices)
    severity = models.CharField(max_length=10, choices=Severity.choices)
    message = models.TextField()
    vehicle = models.ForeignKey(Vehicle, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts")
    driver = models.ForeignKey(Driver, null=True, blank=True, on_delete=models.SET_NULL, related_name="alerts")
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"{self.type} ({self.severity})"
