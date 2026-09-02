import type {
  Vehicle,
  Driver,
  Trip,
  FuelEntry,
  MaintenanceRecord,
  Tyre,
  DocumentRecord,
  Alert,
  Requisition,
  AuditLogEntry,
  AppUser,
  Guard,
} from "@/types";
import {
  seedVehicles,
  seedDrivers,
  seedTrips,
  seedFuelEntries,
  seedMaintenanceRecords,
  seedTyres,
  seedDocuments,
  seedAlerts,
  seedRequisitions,
  seedAuditLog,
  seedUsers,
  seedVehicleTypes,
  seedVehicleMakes,
  seedVehicleModels,
  seedDepartmentMasters,
  seedVehiclePurposes,
  seedMaintenanceServiceTypes,
  seedEngineOils,
  seedPartsConsumables,
  seedWorkshopVendors,
  seedCostCenters,
  seedDrivingLicenceTypes,
  seedFuelTypeMasters,
  seedGearOilTypes,
  seedTyreTypes,
  seedDocumentTypes,
  seedLocationSites,
  seedGates,
  seedGuards,
} from "./fixtures";

import type { MasterDataCollections, MasterDataKey } from "@/types/master-data";

export type { MasterDataCollections, MasterDataKey } from "@/types/master-data";

const STORAGE_KEY = "fm-mock-db-v5";

interface Db extends Record<MasterDataKey, unknown[]> {
  vehicles: Vehicle[];
  drivers: Driver[];
  trips: Trip[];
  fuelEntries: FuelEntry[];
  maintenanceRecords: MaintenanceRecord[];
  tyres: Tyre[];
  documents: DocumentRecord[];
  alerts: Alert[];
  requisitions: Requisition[];
  auditLog: AuditLogEntry[];
  users: AppUser[];
  vehicleTypes: VehicleTypeMaster[];
  vehicleMakes: VehicleMakeMaster[];
  vehicleModels: VehicleModelMaster[];
  departmentMasters: DepartmentMaster[];
  vehiclePurposes: VehiclePurposeMaster[];
  maintenanceServiceTypes: MaintenanceServiceTypeMaster[];
  engineOils: EngineOilMaster[];
  partsConsumables: PartConsumableMaster[];
  workshopVendors: WorkshopVendorMaster[];
  costCenters: CostCenterMaster[];
  drivingLicenceTypes: DrivingLicenceTypeMaster[];
  fuelTypeMasters: FuelTypeMaster[];
  gearOilTypes: GearOilTypeMaster[];
  tyreTypes: TyreTypeMaster[];
  documentTypes: DocumentTypeMaster[];
  locationSites: LocationSiteMaster[];
  gates: GateMaster[];
  guards: Guard[];
  settings: AppSettings;
}

export interface MaintenanceThresholds {
  /** KM remaining at/below which status flips from "normal" to "due_soon". */
  dueSoonKm: number;
  /** KM remaining below which status flips from "due_soon" to "urgent". */
  urgentKm: number;
}

export interface AppSettings {
  maintenanceThresholds: MaintenanceThresholds;
}

const DEFAULT_SETTINGS: AppSettings = {
  maintenanceThresholds: { dueSoonKm: 1000, urgentKm: 500 },
};

function seed(): Db {
  return {
    vehicles: structuredClone(seedVehicles),
    drivers: structuredClone(seedDrivers),
    trips: structuredClone(seedTrips),
    fuelEntries: structuredClone(seedFuelEntries),
    maintenanceRecords: structuredClone(seedMaintenanceRecords),
    tyres: structuredClone(seedTyres),
    documents: structuredClone(seedDocuments),
    vehicleTypes: structuredClone(seedVehicleTypes),
    vehicleMakes: structuredClone(seedVehicleMakes),
    vehicleModels: structuredClone(seedVehicleModels),
    departmentMasters: structuredClone(seedDepartmentMasters),
    vehiclePurposes: structuredClone(seedVehiclePurposes),
    maintenanceServiceTypes: structuredClone(seedMaintenanceServiceTypes),
    engineOils: structuredClone(seedEngineOils),
    partsConsumables: structuredClone(seedPartsConsumables),
    workshopVendors: structuredClone(seedWorkshopVendors),
    costCenters: structuredClone(seedCostCenters),
    drivingLicenceTypes: structuredClone(seedDrivingLicenceTypes),
    fuelTypeMasters: structuredClone(seedFuelTypeMasters),
    gearOilTypes: structuredClone(seedGearOilTypes),
    tyreTypes: structuredClone(seedTyreTypes),
    documentTypes: structuredClone(seedDocumentTypes),
    locationSites: structuredClone(seedLocationSites),
    gates: structuredClone(seedGates),
    guards: structuredClone(seedGuards),
    alerts: structuredClone(seedAlerts),
    requisitions: structuredClone(seedRequisitions),
    auditLog: structuredClone(seedAuditLog),
    users: structuredClone(seedUsers),
    settings: structuredClone(DEFAULT_SETTINGS),
  };
}

function load(): Db {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Db;
      if (!parsed.settings) parsed.settings = structuredClone(DEFAULT_SETTINGS);
      return parsed;
    }
  } catch {
    // fall through to reseed
  }
  const fresh = seed();
  persist(fresh);
  return fresh;
}

function persist(db: Db) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // storage unavailable (private mode, quota) — keep working in memory only
  }
}

let db = load();

/** Simulated network latency so loading states are visible during UI development. */
export function delay<T>(value: T, ms = 350): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function getDb() {
  return db;
}

export function commit() {
  persist(db);
}

export function resetMockDb() {
  db = seed();
  persist(db);
}

export function nextId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

/** Typed accessor into one of the generic master-data arrays keyed by MasterDataKey. */
export function getMasterCollection<K extends MasterDataKey>(key: K): MasterDataCollections[K][] {
  return db[key] as MasterDataCollections[K][];
}
