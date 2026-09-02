from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.views import TokenObtainPairView

from accounts.models import User
from accounts.permissions import allow_roles
from accounts.serializers import FleetoraTokenObtainPairSerializer, UserManageSerializer, UserSerializer


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
