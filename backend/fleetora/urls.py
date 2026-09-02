from django.contrib import admin
from django.urls import include, path

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/", include("accounts.urls")),
    path("api/", include("fleet.urls")),
    path("api/", include("alerts.urls")),
    path("api/", include("audit.urls")),
    path("api/", include("masterdata.urls")),
    path("api/", include("maintenance.urls")),
    path("api/", include("documents.urls")),
    path("api/", include("requisitions.urls")),
    path("api/", include("common.urls")),
]
