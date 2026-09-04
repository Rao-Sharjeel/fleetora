from django.contrib.auth.models import AnonymousUser
from django.db import connection
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed
from rest_framework_simplejwt.authentication import JWTAuthentication

from accounts.models import KioskDevice


class KioskDeviceAuthentication(BaseAuthentication):
    """
    Authenticates a gate kiosk (Exit/Entry/Fuel) via a static per-device API
    key, entirely independent of JWT user auth. request.user stays anonymous;
    request.auth is set to the KioskDevice, so views can tell "a device called
    this" apart from "a logged-in staff member called this" when both are
    allowed (see fleet/views.py — the 5 kiosk-facing endpoints accept either).
    """

    def authenticate(self, request):
        key = request.headers.get("X-Kiosk-Api-Key")
        if not key:
            return None

        try:
            device = KioskDevice.objects.get(api_key=key, active=True)
        except KioskDevice.DoesNotExist as exc:
            raise AuthenticationFailed("Invalid or inactive kiosk device.") from exc

        device.touch()
        # KioskDevice itself lives in the shared public schema (found above via
        # the search path regardless of current schema — see its model docstring),
        # but this device's actual data (vehicles, trips, ...) lives in its own
        # tenant's schema. Switch there so the rest of this request's queries
        # land in the right place, same as TenantAwareJWTAuthentication below.
        connection.set_tenant(device.tenant)
        return (AnonymousUser(), device)


class TenantAwareJWTAuthentication(JWTAuthentication):
    """
    Identical to the stock JWTAuthentication (AUTH_USER_MODEL didn't change,
    only where its table lives) except for one addition: once the user is
    resolved, switch the DB connection to their tenant's schema before the
    view runs. This is what replaces hostname-based schema resolution now that
    every tenant shares one login domain — TenantMainMiddleware leaves the
    connection on the public schema (where accounts_user actually lives, so
    the token's user lookup below resolves directly), and this class is what
    moves it the rest of the way to the tenant's own schema for everything
    the view itself queries (Vehicle, Trip, ...).
    """

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        connection.set_tenant(user.tenant)
        return user
