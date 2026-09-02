from rest_framework import generics

from accounts.permissions import allow_roles
from common.models import FleetSettings
from common.serializers import FleetSettingsSerializer


class FleetSettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/settings/ — the one-row-per-tenant config the Administration
    screen edits. Admin-only, matching that screen's own role restriction."""

    serializer_class = FleetSettingsSerializer
    permission_classes = [allow_roles("admin")]

    def get_object(self) -> FleetSettings:
        return FleetSettings.load()
