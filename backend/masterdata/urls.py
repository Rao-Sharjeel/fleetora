from rest_framework.routers import DefaultRouter

from masterdata import views as v

router = DefaultRouter()

# URL slug -> viewset. Slugs mirror the frontend's master-data collection keys.
for path, viewset in [
    ("vehicle-types", v.VehicleTypeViewSet),
    ("vehicle-makes", v.VehicleMakeViewSet),
    ("vehicle-models", v.VehicleModelViewSet),
    ("departments", v.DepartmentViewSet),
    ("vehicle-purposes", v.VehiclePurposeViewSet),
    ("maintenance-service-types", v.MaintenanceServiceTypeViewSet),
    ("engine-oils", v.EngineOilViewSet),
    ("parts-consumables", v.PartConsumableViewSet),
    ("workshop-vendors", v.WorkshopVendorViewSet),
    ("cost-centers", v.CostCenterViewSet),
    ("driving-licence-types", v.DrivingLicenceTypeViewSet),
    ("fuel-types", v.FuelTypeViewSet),
    ("gear-oil-types", v.GearOilTypeViewSet),
    ("tyre-types", v.TyreTypeViewSet),
    ("document-types", v.DocumentTypeViewSet),
    ("location-sites", v.LocationSiteViewSet),
    ("gates", v.GateViewSet),
]:
    router.register(path, viewset, basename=path)

urlpatterns = router.urls
