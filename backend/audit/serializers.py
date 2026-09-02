from rest_framework import serializers

from audit.models import AuditLogEntry


class AuditLogEntrySerializer(serializers.ModelSerializer):
    user = serializers.CharField(source="user.name", read_only=True, default="")

    class Meta:
        model = AuditLogEntry
        fields = ["id", "user", "timestamp", "transaction", "previous_value", "new_value", "reason"]
        read_only_fields = fields
