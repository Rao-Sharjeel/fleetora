from rest_framework import viewsets

from accounts.permissions import allow_roles
from documents.models import DocumentRecord
from documents.serializers import DocumentRecordSerializer

READ_HEAVY = allow_roles("admin", "fleet_manager", "management")
OPERATIONAL_WRITE = allow_roles("admin", "fleet_manager")


class DocumentRecordViewSet(viewsets.ModelViewSet):
    queryset = DocumentRecord.objects.select_related("document_type", "vehicle", "driver").all()
    serializer_class = DocumentRecordSerializer
    filterset_fields = ["vehicle", "driver"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY()]
        return [OPERATIONAL_WRITE()]
