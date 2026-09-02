from rest_framework import mixins, viewsets

from accounts.permissions import allow_roles
from audit.models import AuditLogEntry
from audit.serializers import AuditLogEntrySerializer


class AuditLogViewSet(mixins.ListModelMixin, viewsets.GenericViewSet):
    """Read-only — audit entries are only ever written from inside other views (e.g.
    fleet.views.VehicleViewSet.set_allowed_to_exit), never posted directly by a client."""

    queryset = AuditLogEntry.objects.all()
    serializer_class = AuditLogEntrySerializer
    permission_classes = [allow_roles("admin")]
