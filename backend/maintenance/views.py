from rest_framework import viewsets

from accounts.access import PermissionRulesMixin, crud_rules
from maintenance.models import MaintenanceRecord, Tyre
from maintenance.serializers import MaintenanceRecordSerializer, TyreSerializer


class MaintenanceRecordViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = MaintenanceRecord.objects.select_related("vehicle").all()
    serializer_class = MaintenanceRecordSerializer
    filterset_fields = ["vehicle"]

    permission_rules = crud_rules("maintenance")


class TyreViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Tyre.objects.select_related("vehicle").all()
    serializer_class = TyreSerializer
    filterset_fields = ["vehicle", "status"]

    permission_rules = crud_rules("tyres")
