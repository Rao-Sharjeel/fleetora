"""
Used only when a request resolves to the public tenant (schema_name == "public"
— see TenantMainMiddleware.setup_url_routing and PUBLIC_SCHEMA_URLCONF in
settings/base.py). Every other host still uses the normal fleetora.urls, which
doesn't include these routes at all, so they simply don't exist outside the
public-tenant domain.
"""

from django.urls import include, path

urlpatterns = [
    path("api/platform/", include("tenants.urls")),
]
