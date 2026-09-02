from rest_framework import viewsets

from accounts.permissions import allow_roles
from masterdata import models as m
from masterdata import serializers as s

# Master setup is admin-only to write; everyone who can see fleet data can read it
# (dropdowns across the app are populated from these tables).
READ_ROLES = allow_roles("admin", "fleet_manager", "management", "gate_guard")
WRITE_ROLES = allow_roles("admin")


class MasterViewSet(viewsets.ModelViewSet):
    """One generic viewset for all 17 master tables — subclasses only bind a
    queryset and serializer, mirroring the frontend's single createMasterDataApi
    factory rather than 17 near-identical implementations."""

    filterset_fields = ["status"]
    search_fields = ["code", "name"]

    def get_permissions(self):
        if self.action in ("list", "retrieve"):
            return [READ_ROLES()]
        return [WRITE_ROLES()]


def master_viewset(model_class, serializer_class):
    return type(
        f"{model_class.__name__}ViewSet",
        (MasterViewSet,),
        {"queryset": model_class.objects.all(), "serializer_class": serializer_class},
    )


VehicleTypeViewSet = master_viewset(m.VehicleTypeMaster, s.VehicleTypeSerializer)
VehicleMakeViewSet = master_viewset(m.VehicleMakeMaster, s.VehicleMakeSerializer)
VehicleModelViewSet = master_viewset(m.VehicleModelMaster, s.VehicleModelSerializer)
DepartmentViewSet = master_viewset(m.DepartmentMaster, s.DepartmentSerializer)
VehiclePurposeViewSet = master_viewset(m.VehiclePurposeMaster, s.VehiclePurposeSerializer)
MaintenanceServiceTypeViewSet = master_viewset(
    m.MaintenanceServiceTypeMaster, s.MaintenanceServiceTypeSerializer
)
EngineOilViewSet = master_viewset(m.EngineOilMaster, s.EngineOilSerializer)
PartConsumableViewSet = master_viewset(m.PartConsumableMaster, s.PartConsumableSerializer)
WorkshopVendorViewSet = master_viewset(m.WorkshopVendorMaster, s.WorkshopVendorSerializer)
CostCenterViewSet = master_viewset(m.CostCenterMaster, s.CostCenterSerializer)
DrivingLicenceTypeViewSet = master_viewset(m.DrivingLicenceTypeMaster, s.DrivingLicenceTypeSerializer)
FuelTypeViewSet = master_viewset(m.FuelTypeMaster, s.FuelTypeSerializer)
GearOilTypeViewSet = master_viewset(m.GearOilTypeMaster, s.GearOilTypeSerializer)
TyreTypeViewSet = master_viewset(m.TyreTypeMaster, s.TyreTypeSerializer)
DocumentTypeViewSet = master_viewset(m.DocumentTypeMaster, s.DocumentTypeSerializer)
LocationSiteViewSet = master_viewset(m.LocationSiteMaster, s.LocationSiteSerializer)
GateViewSet = master_viewset(m.GateMaster, s.GateSerializer)
