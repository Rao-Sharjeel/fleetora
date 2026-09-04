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
        if self.action == "create":
            return KioskDeviceCreateSerializer
        return KioskDeviceSerializer

    def perform_create(self, serializer):
        serializer.save(tenant=self.request.user.tenant)
