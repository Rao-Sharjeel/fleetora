from rest_framework import viewsets

from accounts.access import PermissionRulesMixin, any_of, crud_rules
from alerts.models import Alert
from alerts.serializers import AlertSerializer


class AlertViewSet(PermissionRulesMixin, viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    permission_rules = crud_rules(
        "alerts",
        # Raised by the gate (a kiosk device, or a guard at the gate pages) on a
        # blocked double exit, as well as by whoever manages alerts.
        create=any_of("alerts.manage", "gate.exit", "gate.entry", "gate.fuel", kiosk=True),
        update=any_of("alerts.manage"),
        partial_update=any_of("alerts.manage"),
        destroy=any_of("alerts.manage"),
    )
