from django.urls import path

from common.views import FleetSettingsView

urlpatterns = [
    path("settings/", FleetSettingsView.as_view(), name="fleet-settings"),
]
