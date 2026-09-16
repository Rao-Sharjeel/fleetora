from django.urls import path
from rest_framework.routers import DefaultRouter

from masterdata import views as v

router = DefaultRouter()

# URL slug -> viewset. Slugs mirror the frontend's master-data collection keys.
# Named url_path, not path — that loop variable used to shadow the `path`
# import for the rest of the module, so any path(...) call added below it
# (see AddVehicleReferenceDataView's route) resolved to a plain string
# instead of the URLconf function and blew up with "'str' object is not
# callable" the moment Django imported this file.
for url_path, viewset in [
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
    router.register(url_path, viewset, basename=url_path)

urlpatterns = [
    path("vehicle-reference-data/add/", v.AddVehicleReferenceDataView.as_view(), name="add-vehicle-reference-data"),
] + router.urls
