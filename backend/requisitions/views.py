from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.permissions import allow_roles
from requisitions.models import Requisition
from requisitions.serializers import RequisitionSerializer

READ_HEAVY = allow_roles("admin", "fleet_manager", "management")
OPERATIONAL_WRITE = allow_roles("admin", "fleet_manager")


class RequisitionViewSet(viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related("vehicle").all()
    serializer_class = RequisitionSerializer
    filterset_fields = ["status", "department"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [READ_HEAVY()]
        return [OPERATIONAL_WRITE()]

    def _transition(self, request, pk, target: Requisition.Status):
        requisition = self.get_object()
        if requisition.status != Requisition.Status.PENDING:
            return Response(
                {"detail": f"Requisition is already {requisition.get_status_display().lower()}."},
                status=400,
            )
        requisition.status = target
        requisition.approver = request.user.name if request.user.is_authenticated else ""
        requisition.save(update_fields=["status", "approver"])
        return Response(RequisitionSerializer(requisition).data)

    # New capability — the mock layer never implemented status transitions at all.
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._transition(request, pk, Requisition.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._transition(request, pk, Requisition.Status.REJECTED)
