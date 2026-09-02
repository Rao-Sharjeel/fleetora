import uuid

from django.db import models
from django.utils import timezone

from common.models import Sequence


class Requisition(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending"
        APPROVED = "approved"
        REJECTED = "rejected"
        FULFILLED = "fulfilled"

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    requisition_number = models.CharField(max_length=30, unique=True, editable=False)
    # Free text: the requester is often a department head who never logs in.
    requested_by = models.CharField(max_length=120)
    department = models.CharField(max_length=120)
    vehicle = models.ForeignKey(
        "fleet.Vehicle", null=True, blank=True, on_delete=models.SET_NULL, related_name="requisitions"
    )
    purpose = models.CharField(max_length=120)
    destination = models.CharField(max_length=120)
    required_date_time = models.DateTimeField()
    expected_return = models.DateTimeField(null=True, blank=True)
    approver = models.CharField(max_length=120, blank=True, default="")
    status = models.CharField(max_length=12, choices=Status.choices, default=Status.PENDING)

    class Meta:
        ordering = ["-required_date_time"]

    def save(self, *args, **kwargs):
        if not self.requisition_number:
            year = timezone.now().year
            # A real per-year sequence, not the mock's random 4 digits.
            self.requisition_number = f"REQ-{year}-{Sequence.next('requisition_number', year):04d}"
        super().save(*args, **kwargs)

    def __str__(self) -> str:
        return self.requisition_number
