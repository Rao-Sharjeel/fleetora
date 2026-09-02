import uuid

from django.db import models


class DocumentRecord(models.Model):
    """
    The frontend models ownership as a polymorphic `ownerType`/`ownerId` string
    pair. Only two owner types exist and always will (vehicle or driver), so this
    uses two nullable FKs with a check constraint instead of a GenericForeignKey —
    keeping real referential integrity and joinability. The serializer re-exposes
    the ownerType/ownerId pair so the API shape still matches the frontend.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle = models.ForeignKey(
        "fleet.Vehicle", null=True, blank=True, on_delete=models.CASCADE, related_name="documents"
    )
    driver = models.ForeignKey(
        "fleet.Driver", null=True, blank=True, on_delete=models.CASCADE, related_name="documents"
    )
    document_type = models.ForeignKey(
        "masterdata.DocumentTypeMaster", on_delete=models.PROTECT, related_name="documents"
    )
    document_number = models.CharField(max_length=60, blank=True, default="")
    issue_date = models.DateField(null=True, blank=True)
    expiry_date = models.DateField()

    class Meta:
        ordering = ["expiry_date"]
        constraints = [
            models.CheckConstraint(
                condition=(
                    models.Q(vehicle__isnull=False, driver__isnull=True)
                    | models.Q(vehicle__isnull=True, driver__isnull=False)
                ),
                name="document_has_exactly_one_owner",
            )
        ]

    @property
    def owner_type(self) -> str:
        return "vehicle" if self.vehicle_id else "driver"

    @property
    def owner_id(self):
        return self.vehicle_id or self.driver_id

    def __str__(self) -> str:
        return f"{self.document_type_id} — expires {self.expiry_date}"
