from django.db import transaction
from django.utils import timezone
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.exceptions import NotAuthenticated
from rest_framework.throttling import ScopedRateThrottle
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from audit.models import AuditLogEntry
from accounts.models import KioskDevice, Role, User, generate_kiosk_key
from audit.models import AuditLogEntry
from common.models import FleetSettings
from accounts.access import AdminOnly
from accounts.permissions_catalog import PERMISSION_GROUPS
from accounts.serializers import (
    FleetoraTokenObtainPairSerializer,
    KioskClaimSerializer,
    KioskDeviceCreateSerializer,
    KioskDeviceSerializer,
    KioskReleaseSerializer,
    RoleSerializer,
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
    """/api/users/ — the Users screen. Admin-only: managing users means handing
    out access, which staff must never be able to do for themselves. User now lives in a SHARED table (see
    its model docstring) — get_queryset()'s tenant filter is what stops a
    tenant admin from seeing/editing every other tenant's users; there's no
    schema boundary doing that job here anymore."""

    serializer_class = UserManageSerializer
    permission_classes = [AdminOnly]

    def get_queryset(self):
        return (
            User.objects.filter(tenant=self.request.user.tenant)
            .select_related("role")
            .prefetch_related("direct_permissions", "role__permissions")
            .order_by("username")
        )

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    def destroy(self, request, *args, **kwargs):
        if self.get_object().pk == request.user.pk:
            raise ValidationError({"detail": "You can't delete your own account."})
        return super().destroy(request, *args, **kwargs)


class RoleViewSet(viewsets.ModelViewSet):
    """/api/auth/roles/ — tenant-defined permission bundles. Admin-only."""

    serializer_class = RoleSerializer
    permission_classes = [AdminOnly]

    def get_queryset(self):
        return Role.objects.filter(tenant=self.request.user.tenant).prefetch_related("permissions")

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)

    def destroy(self, request, *args, **kwargs):
        role = self.get_object()
        count = role.users.count()
        if count:
            # Deleting it would silently strip these users of their access.
            raise ValidationError(
                {"detail": f"{count} user(s) still have the \"{role.name}\" role. Move them to another role first."}
            )
        return super().destroy(request, *args, **kwargs)


class PermissionCatalogView(APIView):
    """GET /api/auth/permissions/ — every permission, grouped, for the role
    and user editors."""

    permission_classes = [AdminOnly]

    def get(self, request):
        return Response(
            [
                {
                    "key": group["key"],
                    "label": group["label"],
                    "permissions": [{"codename": c, "label": label} for c, label in group["permissions"]],
                }
                for group in PERMISSION_GROUPS
            ]
        )


class KioskDeviceViewSet(viewsets.ModelViewSet):
    """/api/kiosk-devices/ — the Kiosk Devices screen. Admin-only. The kiosk apps
    themselves never call this; they authenticate via KioskDeviceAuthentication
    using the api_key this issues, not by hitting this endpoint. Same shared-table
    tenant filtering as UserViewSet above, for the same reason."""

    permission_classes = [AdminOnly]

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

            if not device.apps:
                # Keys minted before any binding existed, and keys an admin
                # saved with nothing ticked. Nothing can be done with one.
                return Response(
                    {"detail": "This key isn't allowed to do anything yet. Ask an administrator to reissue it."},
                    status=403,
                )

            # A single-function build (the standalone Entry/Fuel apps) names
            # itself and must be one of the functions this key allows. The
            # merged app sends nothing and takes whatever the key permits.
            if data.get("app") and data["app"] not in device.apps:
                allowed = ", ".join(dict(KioskDevice.App.choices)[a] for a in device.apps)
                return Response(
                    {"detail": f"This key is for {allowed}, not this app."},
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
        return Response({"name": device.name, "apps": device.apps})


class KioskDeviceSelfView(APIView):
    """What the calling device is allowed to do — `GET /api/kiosk-devices/me/`.

    The merged gate app learns its functions from the claim response, but a
    phone that paired against one of the old single-function builds has a key
    stored and no function list, and an admin can widen or narrow a key long
    after it was claimed. Rather than make either case need a re-pair, the app
    asks on every launch and falls back to what it already had when offline.
    """

    # Deliberately leaves authentication_classes at the project default rather
    # than narrowing it to KioskDeviceAuthentication. DRF takes the 401
    # WWW-Authenticate header from the *first* authenticator, and the kiosk one
    # supplies none — so pinning it here would turn every refusal into a 403
    # and make this the only kiosk endpoint that answers differently.
    permission_classes = [AllowAny]

    def get(self, request):
        device = request.auth
        if not isinstance(device, KioskDevice):
            raise NotAuthenticated("This endpoint is for a paired kiosk device.")
        return Response({"name": device.name, "apps": device.apps})


class KioskReleaseView(APIView):
    """POST /api/kiosk-devices/release/ — a paired kiosk unpairing itself.

    Authenticated as the device, so a kiosk can only ever release *itself*,
    and gated on a password an administrator sets in Settings. The device's
    key survives: installation_id and claimed_at are cleared, so the same key
    can be paired again, by this phone or another one. That is what makes this
    a logout rather than a destruction — a key that could never be re-claimed
    would mean reissuing one every time a phone changed hands.

    With no password configured this refuses outright. An unset password must
    not read as "no password needed", or every device would be one tap from
    unpairing the day the feature ships.
    """

    permission_classes = [AllowAny]
    throttle_scope = "kiosk-release"
    throttle_classes = [ScopedRateThrottle]

    def post(self, request):
        device = request.auth
        if not isinstance(device, KioskDevice):
            raise NotAuthenticated("This endpoint is for a paired kiosk device.")

        # Checked before the body is validated, so a device whose fleet has no
        # password configured always gets told that — rather than a generic
        # "this field is required" for a password that could not have worked.
        settings_row = FleetSettings.load()
        if not settings_row.kiosk_release_password:
            return Response(
                {"detail": "No disconnect password has been set. Ask an administrator to set one in Settings."},
                status=409,
            )

        serializer = KioskReleaseSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if not settings_row.check_kiosk_release_password(serializer.validated_data["password"]):
            return Response({"detail": "That password is not correct."}, status=403)

        device.installation_id = None
        device.claimed_at = None
        device.device_label = ""
        device.save(update_fields=["installation_id", "claimed_at", "device_label"])

        AuditLogEntry.objects.create(
            user=None,
            transaction=f"Kiosk device disconnected — {device.name}",
            previous_value="Paired",
            new_value="Awaiting pairing",
        )
        return Response({"detail": "This device has been disconnected."})
