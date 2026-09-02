from rest_framework import viewsets
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken

from tenants.authentication import SuperAdminJWTAuthentication
from tenants.models import SuperAdmin, Tenant
from tenants.permissions import IsSuperAdmin
from tenants.serializers import TenantCreateSerializer, TenantSerializer


def _tokens_for(admin: SuperAdmin) -> dict:
    """Mints tokens by hand rather than via TokenObtainPairSerializer.get_token()
    (which is hard-wired to AUTH_USER_MODEL via Django's authenticate()) — the
    superadmin_id claim is what SuperAdminJWTAuthentication.get_user() reads.
    simplejwt's RefreshToken.access_token property copies custom claims onto the
    access token automatically, and the stock TokenRefreshView copies them again
    on refresh — no override needed for either."""
    refresh = RefreshToken()
    refresh["superadmin_id"] = str(admin.id)
    refresh["is_superadmin"] = True
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


class SuperAdminLoginView(APIView):
    """POST /api/platform/auth/login/ — returns {access, refresh}. Not JWTAuthentication's
    TokenObtainPairView: SuperAdmin isn't AUTH_USER_MODEL, so Django's authenticate()
    can't check its password — done by hand here instead."""

    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        username = request.data.get("username", "")
        password = request.data.get("password", "")
        try:
            admin = SuperAdmin.objects.get(username=username, active=True)
        except SuperAdmin.DoesNotExist:
            return Response({"detail": "Invalid credentials."}, status=401)

        if not admin.check_password(password):
            return Response({"detail": "Invalid credentials."}, status=401)

        return Response(_tokens_for(admin))


class TenantViewSet(viewsets.ModelViewSet):
    """/api/platform/tenants/ — only reachable via the public-tenant domain
    (see fleetora/urls_public.py). Super-admin-only."""

    queryset = Tenant.objects.exclude(schema_name="public").order_by("-created_at")
    authentication_classes = [SuperAdminJWTAuthentication]
    permission_classes = [IsSuperAdmin]

    def get_serializer_class(self):
        if self.action == "create":
            return TenantCreateSerializer
        return TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = serializer.save()
        return Response(TenantSerializer(tenant).data, status=201)
