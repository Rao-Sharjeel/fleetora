from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLogEntry
from accounts.models import KioskDevice, User, generate_kiosk_key
from accounts.permissions import allow_roles
from accounts.serializers import (
    FleetoraTokenObtainPairSerializer,
    KioskClaimSerializer,
    KioskDeviceCreateSerializer,
    KioskDeviceSerializer,
    UserManageSerializer,
    UserSerializer,
)


class LoginView(TokenObtainPairView):
    """POST /api/auth/login/ — returns {access, refresh}, role/name embedded in the access token."""

    serializer_class = FleetoraTokenObtainPairSerializer


class MeView(APIView):
    """GET /api/auth/me/ — what the SPA calls right after login to populate its session store."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class UserViewSet(viewsets.ModelViewSet):
    """/api/users/ — the Users & Permissions screen. Admin-only, same as that
    screen's own nav role restriction. User now lives in a SHARED table (see
    its model docstring) — get_queryset()'s tenant filter is what stops a
    tenant admin from seeing/editing every other tenant's users; there's no
    schema boundary doing that job here anymore."""

    serializer_class = UserManageSerializer
    permission_classes = [allow_roles("admin")]

    def get_queryset(self):
        return User.objects.filter(tenant=self.request.user.tenant).order_by("username")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class KioskDeviceViewSet(viewsets.ModelViewSet):
    """/api/kiosk-devices/ — the Kiosk Devices screen. Admin-only. The kiosk apps
    themselves never call this; they authenticate via KioskDeviceAuthentication
    using the api_key this issues, not by hitting this endpoint. Same shared-table
    tenant filtering as UserViewSet above, for the same reason."""

    permission_classes = [allow_roles("admin")]

    def get_queryset(self):
        return KioskDevice.objects.filter(tenant=self.request.user.tenant).order_by("-created_at")

    def get_serializer_class(self):
        if self.action in ("create", "reissue"):
            return KioskDeviceCreateSerializer
        return KioskDeviceSerializer

    @action(detail=True, methods=["post"])
    def reissue(self, request, pk=None):
        """Issue a fresh key for a device that lost its pairing.

        A claimed key can never be re-claimed — that is the point — so a tablet
        whose browser storage was cleared, or that was re-imaged, needs a new
        one. The old key string is overwritten and stops working immediately.
        """
        device = self.get_object()
        previous = "paired" if device.claimed else "unpaired"
        device.api_key = generate_kiosk_key()
        device.installation_id = None
        device.claimed_at = None
        device.device_label = ""
        device.save(update_fields=["api_key", "installation_id", "claimed_at", "device_label"])

        AuditLogEntry.objects.create(
            user=request.user if request.user.is_authenticated else None,
            transaction=f"Kiosk key reissued — {device.name}",
            previous_value=previous,
            new_value="awaiting pairing",
            reason="Previous key permanently invalidated.",
        )
        return Response(KioskDeviceCreateSerializer(device).data)

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)


class KioskClaimView(APIView):
    """POST /api/kiosk-devices/claim/ — a kiosk redeeming its key.

    Unauthenticated by necessity: this is how a device gets its credential in
    the first place. The key itself is the only thing that lets a claim
    through, and it works exactly once.
    """

    authentication_classes: list = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = KioskClaimSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        with transaction.atomic():
            try:
                device = KioskDevice.objects.select_for_update().get(api_key=data["api_key"], active=True)
            except KioskDevice.DoesNotExist:
                return Response({"detail": "That key isn't valid. Check it with an administrator."}, status=404)

            if device.app != data["app"]:
                issued_for = device.get_app_display() if device.app else "a different app"
                return Response(
                    {"detail": f"This key was issued for {issued_for}, not this app."},
                    status=403,
                )

            if device.installation_id and device.installation_id != data["installation_id"]:
                # Claimed already, by something that is not us. Never reassigned:
                # that is the whole point of the binding.
                return Response(
                    {
                        "detail": "This key is already paired to another device. "
                        "Ask an administrator to issue a new one.",
                    },
                    status=409,
                )

            if not device.installation_id:
                device.installation_id = data["installation_id"]
                device.claimed_at = timezone.now()
                device.device_label = data.get("device_label", "")
                device.save(update_fields=["installation_id", "claimed_at", "device_label"])

        # Re-claiming from the same install is a no-op success, so a kiosk that
        # retries a dropped pairing request doesn't lock itself out.
        return Response({"name": device.name, "app": device.app})
