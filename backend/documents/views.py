from rest_framework import viewsets

from accounts.access import PermissionRulesMixin, crud_rules
from documents.models import DocumentRecord
from documents.serializers import DocumentRecordSerializer


class DocumentRecordViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = DocumentRecord.objects.select_related("document_type", "vehicle", "driver").all()
    serializer_class = DocumentRecordSerializer
    filterset_fields = ["vehicle", "driver"]

    permission_rules = crud_rules("documents")
