import type {
  VehicleTypeMaster,
  VehicleMakeMaster,
  VehicleModelMaster,
  DepartmentMaster,
  VehiclePurposeMaster,
  MaintenanceServiceTypeMaster,
  EngineOilMaster,
  PartConsumableMaster,
  WorkshopVendorMaster,
  CostCenterMaster,
  DrivingLicenceTypeMaster,
  FuelTypeMaster,
  GearOilTypeMaster,
  TyreTypeMaster,
  DocumentTypeMaster,
  LocationSiteMaster,
  GateMaster,
} from "@/types";

/** Collection-name -> record-type map shared by every master-data setup screen
 * (Vehicle Type, Make, Model, Fuel Type, ...) and the generic CRUD layer behind them. */
export interface MasterDataCollections {
  vehicleTypes: VehicleTypeMaster;
  vehicleMakes: VehicleMakeMaster;
  vehicleModels: VehicleModelMaster;
  departmentMasters: DepartmentMaster;
  vehiclePurposes: VehiclePurposeMaster;
  maintenanceServiceTypes: MaintenanceServiceTypeMaster;
  engineOils: EngineOilMaster;
  partsConsumables: PartConsumableMaster;
  workshopVendors: WorkshopVendorMaster;
  costCenters: CostCenterMaster;
  drivingLicenceTypes: DrivingLicenceTypeMaster;
  fuelTypeMasters: FuelTypeMaster;
  gearOilTypes: GearOilTypeMaster;
  tyreTypes: TyreTypeMaster;
  documentTypes: DocumentTypeMaster;
  locationSites: LocationSiteMaster;
  gates: GateMaster;
}

export type MasterDataKey = keyof MasterDataCollections;

/** MasterDataKey -> the backend's REST URL slug for that resource (masterdata/urls.py). */
export const MASTER_DATA_ENDPOINTS: Record<MasterDataKey, string> = {
  vehicleTypes: "vehicle-types",
  vehicleMakes: "vehicle-makes",
  vehicleModels: "vehicle-models",
  departmentMasters: "departments",
  vehiclePurposes: "vehicle-purposes",
  maintenanceServiceTypes: "maintenance-service-types",
  engineOils: "engine-oils",
  partsConsumables: "parts-consumables",
  workshopVendors: "workshop-vendors",
  costCenters: "cost-centers",
  drivingLicenceTypes: "driving-licence-types",
  fuelTypeMasters: "fuel-types",
  gearOilTypes: "gear-oil-types",
  tyreTypes: "tyre-types",
  documentTypes: "document-types",
  locationSites: "location-sites",
  gates: "gates",
};
