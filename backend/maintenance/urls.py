from rest_framework.routers import DefaultRouter

from maintenance.views import MaintenanceRecordViewSet, TyreViewSet

router = DefaultRouter()
router.register("maintenance-records", MaintenanceRecordViewSet, basename="maintenance-record")
router.register("tyres", TyreViewSet, basename="tyre")

urlpatterns = router.urls
