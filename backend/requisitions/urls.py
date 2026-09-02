from rest_framework.routers import DefaultRouter

from requisitions.views import RequisitionViewSet

router = DefaultRouter()
router.register("requisitions", RequisitionViewSet, basename="requisition")

urlpatterns = router.urls
