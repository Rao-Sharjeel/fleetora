from django.contrib.auth.models import AnonymousUser
from rest_framework.authentication import BaseAuthentication
from rest_framework.exceptions import AuthenticationFailed

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
        return (AnonymousUser(), device)
