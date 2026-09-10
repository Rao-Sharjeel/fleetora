from rest_framework.routers import DefaultRouter

from fleet.views import (
    DriverViewSet,
    FuelEntryViewSet,
    GuardViewSet,
    OdometerIssueViewSet,
    TripViewSet,
    VehicleViewSet,
)

router = DefaultRouter()
router.register("vehicles", VehicleViewSet, basename="vehicle")
router.register("drivers", DriverViewSet, basename="driver")
router.register("guards", GuardViewSet, basename="guard")
router.register("trips", TripViewSet, basename="trip")
router.register("fuel-entries", FuelEntryViewSet, basename="fuel-entry")
router.register("odometer-issues", OdometerIssueViewSet, basename="odometer-issue")

urlpatterns = router.urls
