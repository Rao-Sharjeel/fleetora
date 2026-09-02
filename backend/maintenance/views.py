from rest_framework import viewsets

from accounts.permissions import allow_roles
from maintenance.models import MaintenanceRecord, Tyre
from maintenance.serializers import MaintenanceRecordSerializer, TyreSerializer

READ_HEAVY = allow_roles("admin", "fleet_manager", "management")
OPERATIONAL_WRITE = allow_roles("admin", "fleet_manager")


class MaintenanceRecordViewSet(viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related("vehicle").all()
    serializer_class = MaintenanceRecordSerializer
    filterset_fields = ["vehicle"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY()]
        return [OPERATIONAL_WRITE()]


class TyreViewSet(viewsets.ModelViewSet):
    queryset = Tyre.objects.select_related("vehicle").all()
    serializer_class = TyreSerializer
    filterset_fields = ["vehicle", "status"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY()]
        return [OPERATIONAL_WRITE()]
