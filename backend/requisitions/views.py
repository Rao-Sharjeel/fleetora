from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from accounts.access import PermissionRulesMixin, any_of, crud_rules
from audit.models import AuditLogEntry
from requisitions.models import Requisition
from requisitions.serializers import RequisitionSerializer


class RequisitionViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Requisition.objects.select_related("vehicle").all()
    serializer_class = RequisitionSerializer
    filterset_fields = ["status", "department"]

    permission_rules = crud_rules(
        "requisitions",
        approve=any_of("requisitions.approve"),
        reject=any_of("requisitions.approve"),
    )

    def _reject_if_decided(self, requisition: Requisition) -> Response | None:
        """Changing or removing a requisition is only allowed while nobody has
        acted on it.

        Once it is approved, something downstream has been authorised off the
        back of it; once rejected, there is a decision on record that editing
        would quietly rewrite. Either way the row has stopped being a request
        and become evidence of one. Permission alone is not enough — this is
        about the state of the record, not who is asking.
        """
        if requisition.status != Requisition.Status.PENDING:
            return Response(
                {
                    "detail": (
                        f"This requisition has already been {requisition.get_status_display().lower()} "
                        "and can no longer be changed."
                    ),
                    "status": requisition.status,
                },
                status=409,
            )
        return None

    def update(self, request, *args, **kwargs):
        blocked = self._reject_if_decided(self.get_object())
        return blocked or super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        requisition = self.get_object()
        blocked = self._reject_if_decided(requisition)
        if blocked:
            return blocked
        AuditLogEntry.objects.create(
            user=request.user if request.user.is_authenticated else None,
            transaction=f"Requisition deleted — {requisition.requisition_number}",
            previous_value=f"{requisition.requested_by} · {requisition.purpose} · {requisition.destination}",
            new_value="Deleted",
        )
        return super().destroy(request, *args, **kwargs)

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
        AuditLogEntry.objects.create(
            user=request.user if request.user.is_authenticated else None,
            transaction=f"Requisition {target} — {requisition.requisition_number}",
            previous_value="Pending",
            new_value=requisition.get_status_display(),
        )
        return Response(RequisitionSerializer(requisition).data)

    # New capability — the mock layer never implemented status transitions at all.
    @action(detail=True, methods=["post"])
    def approve(self, request, pk=None):
        return self._transition(request, pk, Requisition.Status.APPROVED)

    @action(detail=True, methods=["post"])
    def reject(self, request, pk=None):
        return self._transition(request, pk, Requisition.Status.REJECTED)
