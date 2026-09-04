from django.conf import settings
from django.conf.urls.static import static
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
    # tenants.urls (Super Admin login + tenant management) — gated by
    # IsSuperAdmin/SuperAdminJWTAuthentication at the view level, not by a
    # separate urlconf: with user-based multi-tenancy there's only ever one
    # login domain now, so every request resolves the same route table
    # regardless of who's calling it (see settings/base.py — PUBLIC_SCHEMA_URLCONF
    # is gone; this is ROOT_URLCONF for every request, tenant user or super admin).
    path("api/platform/", include("tenants.urls")),
]

# Driver/guard/vehicle photos (fleet/models.py) save to MEDIA_ROOT, but nothing
# served MEDIA_URL back out — not even here in DEBUG. In production this same
# job is done by the reverse proxy serving MEDIA_ROOT directly, not by Django.
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
