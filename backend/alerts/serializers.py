from rest_framework import serializers

from alerts.models import Alert
from fleet.models import Driver, Vehicle


class AlertSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source="vehicle", queryset=Vehicle.objects.all(), required=False, allow_null=True
    )
    driver_id = serializers.PrimaryKeyRelatedField(
        source="driver", queryset=Driver.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Alert
        fields = ["id", "type", "severity", "message", "vehicle_id", "driver_id", "created_at"]
        read_only_fields = ["id", "created_at"]
