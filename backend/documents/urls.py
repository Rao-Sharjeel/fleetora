from rest_framework.routers import DefaultRouter

from documents.views import DocumentRecordViewSet

router = DefaultRouter()
router.register("documents", DocumentRecordViewSet, basename="document")

urlpatterns = router.urls
