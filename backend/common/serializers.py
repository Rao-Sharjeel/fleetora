from rest_framework import serializers

from common.models import FleetSettings


class FleetSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = FleetSettings
        fields = ["due_soon_km", "urgent_km"]
