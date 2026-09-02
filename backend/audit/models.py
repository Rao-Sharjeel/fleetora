import uuid

from django.conf import settings
from django.db import models


class AuditLogEntry(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    # Real FK now that auth is in scope — every audit write happens inside an
    # authenticated request, unlike Trip.requestedBy/approvedBy which often
    # name people who never log into Fleetora themselves.
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name="+")
    timestamp = models.DateTimeField(auto_now_add=True)
    transaction = models.CharField(max_length=255)
    previous_value = models.CharField(max_length=255, blank=True, default="")
    new_value = models.CharField(max_length=255, blank=True, default="")
    reason = models.TextField(blank=True, default="")

    class Meta:
        ordering = ["-timestamp"]

    def __str__(self) -> str:
        return self.transaction
