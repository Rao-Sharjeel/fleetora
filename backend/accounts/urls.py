from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import (
    KioskClaimView,
    KioskDeviceSelfView,
    KioskDeviceViewSet,
    LoginView,
    MeView,
    PermissionCatalogView,
    RoleViewSet,
    UserViewSet,
)

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("kiosk-devices", KioskDeviceViewSet, basename="kiosk-device")
router.register("auth/roles", RoleViewSet, basename="role")

urlpatterns = [
    # Before the router: a kiosk claims its key unauthenticated, so this must
    # not fall through to the admin-only KioskDeviceViewSet.
    path("kiosk-devices/claim/", KioskClaimView.as_view(), name="kiosk-claim"),
    # Also before the router, and for the same reason: the caller is a device,
    # not an admin.
    path("kiosk-devices/me/", KioskDeviceSelfView.as_view(), name="kiosk-self"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
    path("auth/permissions/", PermissionCatalogView.as_view(), name="permission-catalog"),
] + router.urls
