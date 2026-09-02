from datetime import date

from rest_framework import serializers

from documents.models import DocumentRecord
from fleet.models import Driver, Vehicle
from masterdata.models import DocumentTypeMaster


class DocumentRecordSerializer(serializers.ModelSerializer):
    # Presented to clients as the ownerType/ownerId pair the frontend types use,
    # while stored as two real FKs.
    owner_type = serializers.ChoiceField(choices=["vehicle", "driver"])
    owner_id = serializers.UUIDField()
    document_type_id = serializers.PrimaryKeyRelatedField(
        source="document_type", queryset=DocumentTypeMaster.objects.all()
    )
    document_alert_status = serializers.SerializerMethodField()
    days_until = serializers.SerializerMethodField()

    class Meta:
        model = DocumentRecord
        fields = [
            "id",
            "owner_type",
            "owner_id",
            "document_type_id",
            "document_number",
            "issue_date",
            "expiry_date",
            "days_until",
            "document_alert_status",
        ]
        read_only_fields = ["id"]

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data["owner_type"] = instance.owner_type
        data["owner_id"] = str(instance.owner_id)
        return data

    def get_days_until(self, obj: DocumentRecord) -> int:
        return (obj.expiry_date - date.today()).days

    def get_document_alert_status(self, obj: DocumentRecord) -> str:
        """Mirrors documents.service.ts documentAlertStatus — a single 30-day
        threshold, matching the actual implementation rather than the stale
        "30/15/7" comment that sits above it."""
        days = self.get_days_until(obj)
        if days < 0:
            return "expired"
        if days <= 30:
            return "expiring_soon"
        return "ok"

    def validate(self, attrs):
        owner_type = attrs.pop("owner_type", None)
        owner_id = attrs.pop("owner_id", None)

        if owner_type and owner_id:
            if owner_type == "vehicle":
                if not Vehicle.objects.filter(pk=owner_id).exists():
                    raise serializers.ValidationError({"owner_id": "Vehicle not found."})
                attrs["vehicle_id"], attrs["driver_id"] = owner_id, None
            else:
                if not Driver.objects.filter(pk=owner_id).exists():
                    raise serializers.ValidationError({"owner_id": "Driver not found."})
                attrs["driver_id"], attrs["vehicle_id"] = owner_id, None
        return attrs
