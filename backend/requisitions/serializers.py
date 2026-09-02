from rest_framework import serializers

from fleet.models import Vehicle
from requisitions.models import Requisition


class RequisitionSerializer(serializers.ModelSerializer):
    vehicle_id = serializers.PrimaryKeyRelatedField(
        source="vehicle", queryset=Vehicle.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Requisition
        fields = [
            "id",
            "requisition_number",
            "requested_by",
            "department",
            "vehicle_id",
            "purpose",
            "destination",
            "required_date_time",
            "expected_return",
            "approver",
            "status",
        ]
        # status is never client-settable on create — matches the mock, where
        # createRequisition always forced "pending". Transitions go through the
        # approve/reject actions instead.
        read_only_fields = ["id", "requisition_number", "status", "approver"]
