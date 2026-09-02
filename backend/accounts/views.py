from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import KioskDevice, User
from accounts.permissions import allow_roles
from accounts.serializers import (
    FleetoraTokenObtainPairSerializer,
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
    screen's own nav role restriction."""

    queryset = User.objects.all().order_by("username")
    serializer_class = UserManageSerializer
    permission_classes = [allow_roles("admin")]


class KioskDeviceViewSet(viewsets.ModelViewSet):
    """/api/kiosk-devices/ — the Kiosk Devices screen. Admin-only. The kiosk apps
    themselves never call this; they authenticate via KioskDeviceAuthentication
    using the api_key this issues, not by hitting this endpoint."""

    queryset = KioskDevice.objects.all().order_by("-created_at")
    permission_classes = [allow_roles("admin")]

    def get_serializer_class(self):
        if self.action == "create":
            return KioskDeviceCreateSerializer
        return KioskDeviceSerializer
