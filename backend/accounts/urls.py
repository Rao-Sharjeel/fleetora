from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from accounts.views import KioskClaimView, KioskDeviceViewSet, LoginView, MeView, UserViewSet

router = DefaultRouter()
router.register("users", UserViewSet, basename="user")
router.register("kiosk-devices", KioskDeviceViewSet, basename="kiosk-device")

urlpatterns = [
    # Before the router: a kiosk claims its key unauthenticated, so this must
    # not fall through to the admin-only KioskDeviceViewSet.
    path("kiosk-devices/claim/", KioskClaimView.as_view(), name="kiosk-claim"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="auth-refresh"),
    path("auth/me/", MeView.as_view(), name="auth-me"),
] + router.urls
