from rest_framework import viewsets

from accounts.permissions import allow_kiosk_or_roles, allow_roles
from alerts.models import Alert
from alerts.serializers import AlertSerializer


class AlertViewSet(viewsets.ModelViewSet):
    queryset = Alert.objects.all()
    serializer_class = AlertSerializer

    def get_permissions(self):
        if self.action == "create":
            # One of the 5 kiosk-facing calls (createAlert) — a kiosk device fires this
            # itself on a double-exit block, so it needs to be reachable without a user login.
            return [allow_kiosk_or_roles("admin", "fleet_manager", "gate_guard")()]
        return [allow_roles("admin", "fleet_manager", "management")()]
