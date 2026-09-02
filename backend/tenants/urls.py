from django.urls import path
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView

from tenants.views import SuperAdminLoginView, TenantViewSet

router = DefaultRouter()
router.register("tenants", TenantViewSet, basename="tenant")

urlpatterns = [
    path("auth/login/", SuperAdminLoginView.as_view(), name="superadmin-login"),
    path("auth/refresh/", TokenRefreshView.as_view(), name="superadmin-refresh"),
] + router.urls
