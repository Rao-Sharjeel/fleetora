from django.contrib import admin

from masterdata import models as m

for model in [
    m.VehicleTypeMaster, m.VehicleMakeMaster, m.VehicleModelMaster, m.DepartmentMaster,
    m.VehiclePurposeMaster, m.MaintenanceServiceTypeMaster, m.EngineOilMaster,
    m.PartConsumableMaster, m.WorkshopVendorMaster, m.CostCenterMaster,
    m.DrivingLicenceTypeMaster, m.FuelTypeMaster, m.GearOilTypeMaster, m.TyreTypeMaster,
    m.DocumentTypeMaster, m.LocationSiteMaster, m.GateMaster,
]:
    admin.site.register(model)
