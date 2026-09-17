from rest_framework import generics

from accounts.access import any_of, can_read
from common.models import FleetSettings
from common.serializers import FleetSettingsSerializer


class FleetSettingsView(generics.RetrieveUpdateAPIView):
    """GET/PATCH /api/settings/ — the one-row-per-tenant config the Administration
    screen edits."""

    serializer_class = FleetSettingsSerializer

    def get_permissions(self):
        if self.request.method in ("GET", "HEAD", "OPTIONS"):
            return [can_read("settings")()]
        return [any_of("settings.edit")()]

    def get_object(self) -> FleetSettings:
        return FleetSettings.load()
