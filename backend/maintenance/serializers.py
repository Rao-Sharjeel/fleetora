from rest_framework import serializers

from common.models import FleetSettings
from fleet.models import Vehicle
from maintenance.models import MaintenanceRecord, Tyre


class MaintenanceRecordSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(source="vehicle", queryset=Vehicle.objects.all())
    maintenance_alert_status = serializers.SerializerMethodField()
    remaining_km = serializers.SerializerMethodField()

    class Meta:
        model = MaintenanceRecord
        fields = [
            "id",
            "vehicle_id",
            "date",
            "odometer",
            "workshop",
            "categories",
            "total_cost",
            "next_due_odometer",
            "next_due_date",
            "remarks",
            "remaining_km",
            "maintenance_alert_status",
        ]
        read_only_fields = ["id"]

    def get_remaining_km(self, obj: MaintenanceRecord) -> int | None:
        if obj.next_due_odometer is None:
            return None
        return obj.next_due_odometer - obj.vehicle.current_odometer

    def get_maintenance_alert_status(self, obj: MaintenanceRecord) -> str | None:
        """Thresholds are admin-configurable via FleetSettings (Administration screen),
        not hardcoded — mirrors maintenance.service.ts's maintenanceAlertStatus shape."""
        remaining = self.get_remaining_km(obj)
        if remaining is None:
            return None
        settings = FleetSettings.load()
        if remaining < 0:
            return "overdue"
        if remaining < settings.urgent_km:
            return "urgent"
        if remaining <= settings.due_soon_km:
            return "due_soon"
        return "normal"


class TyreSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source="vehicle", queryset=Vehicle.objects.all(), required=False, allow_null=True
    )
    mileage = serializers.SerializerMethodField()
    remaining_km = serializers.SerializerMethodField()

    class Meta:
        model = Tyre
        fields = [
            "id",
            "tyre_code",
            "brand",
            "size",
            "serial_number",
            "vehicle_id",
            "wheel_position",
            "install_date",
            "install_odometer",
            "expected_life_km",
            "status",
            "mileage",
            "remaining_km",
        ]
        read_only_fields = ["id"]

    def get_mileage(self, obj: Tyre) -> int:
        """Mirrors tyres.service.ts tyreMileage — computed, never stored."""
        if not obj.install_odometer or not obj.vehicle:
            return 0
        return max(0, obj.vehicle.current_odometer - obj.install_odometer)

    def get_remaining_km(self, obj: Tyre) -> int:
        return obj.expected_life_km - self.get_mileage(obj)
