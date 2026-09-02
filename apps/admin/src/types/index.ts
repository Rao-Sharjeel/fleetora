export type Role =
  | "admin"
  | "fleet_manager"
  | "gate_guard"
  | "management"
  | "driver";

export interface RoleDefinition {
  id: Role;
  label: string;
  description: string;
}

export type VehicleStatus = "available" | "outside" | "workshop" | "inactive";

export interface Vehicle {
  id: string;
  internalId: string;
  registrationNumber: string;
  company: string;
  make: string;
  model: string;
  variant?: string;
  year: number;
  colour: string;
  fuelType: "petrol" | "diesel" | "other";
  engineNumber?: string;
  chassisNumber?: string;
  departmentCostCentre?: string;
  assignedDriverId?: string;
  expectedFuelAverageKmpl: number;
  currentOdometer: number;
  status: VehicleStatus;
  photoUrl?: string;
  qrCode: string;
  seatingCapacity?: number;
  transmission?: "manual" | "automatic";
  driveType?: string;
  bodyType?: string;
  fuelAverageAlertLow?: number;
  fuelAverageAlertHigh?: number;
  oilChangeKm?: number;
  tyreChangeKm?: number;
  fuelFilterChangeKm?: number;
  gearOilChangeKm?: number;
  timingBeltChangeKm?: number;
  allowedToExit: boolean;
  allowedToExitReason?: string;
  allowedToExitUpdatedBy?: string;
  allowedToExitUpdatedAt?: string;
}

export type LicenceStatus = "valid" | "expiring_soon" | "expired";

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  photoUrl?: string;
  companyIdCode?: string;
  cnic: string;
  mobile: string;
  licenceNumber: string;
  licenceCategory: string;
  licenceExpiry: string;
  department: string;
  assignedVehicleId?: string;
  status: "active" | "inactive";
  emergencyContact?: string;
  fatherHusbandName?: string;
  dateOfBirth?: string;
  gender?: "Male" | "Female" | "Other";
  residentialAddress?: string;
  dateOfJoining?: string;
  totalExperienceYears?: number;
  accessLevel?: string;
  otherDetails?: {
    uniformIssued?: boolean;
    idCardIssued?: boolean;
    rfidAccessCard?: boolean;
    nightDutyAllowed?: boolean;
  };
}

export type TripStatus = "open" | "completed";
export type TripDurationStatus = "normal" | "expected_soon" | "overdue";
export type ReturnCondition = "ok" | "maintenance_required" | "damage_incident";

export interface Trip {
  id: string;
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  guardId?: string;
  purpose: string;
  destination: string;
  requestedBy: string;
  department: string;
  approvedBy?: string;
  outTime: string;
  inTime?: string;
  odometerOut: number;
  odometerIn?: number;
  tripKm?: number;
  status: TripStatus;
  returnCondition?: ReturnCondition;
  remarks?: string;
  expectedReturn?: string;
}

export interface FuelEntry {
  id: string;
  vehicleId: string;
  driverId: string;
  dateTime: string;
  odometer: number;
  fuelType: "petrol" | "diesel" | "other";
  litres: number;
  ratePerLitre: number;
  total: number;
  fuelStation: string;
  paymentMethod: string;
  receiptNo?: string;
  fullTank: boolean;
}

export type MaintenanceCategory =
  | "engine"
  | "transmission"
  | "brakes"
  | "suspension"
  | "electrical"
  | "ac"
  | "tyres"
  | "other";

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  date: string;
  odometer: number;
  workshop: string;
  categories: MaintenanceCategory[];
  totalCost: number;
  nextDueOdometer?: number;
  nextDueDate?: string;
  remarks?: string;
}

export type MaintenanceAlertStatus = "normal" | "due_soon" | "urgent" | "overdue";

export interface Tyre {
  id: string;
  tyreCode: string;
  brand: string;
  size: string;
  serialNumber: string;
  vehicleId?: string;
  wheelPosition?: string;
  installDate?: string;
  installOdometer?: number;
  expectedLifeKm: number;
  status: "in_use" | "spare" | "scrap" | "store";
}

export type DocumentAlertStatus = "ok" | "expiring_soon" | "expired";

export interface DocumentRecord {
  id: string;
  ownerType: "vehicle" | "driver";
  ownerId: string;
  documentType: string;
  documentNumber?: string;
  issueDate?: string;
  expiryDate: string;
}

export interface Requisition {
  id: string;
  requisitionNumber: string;
  requestedBy: string;
  department: string;
  vehicleId?: string;
  purpose: string;
  destination: string;
  requiredDateTime: string;
  expectedReturn?: string;
  approver?: string;
  status: "pending" | "approved" | "rejected" | "fulfilled";
}

export interface Alert {
  id: string;
  type: "maintenance" | "tyre" | "document" | "fuel_exception" | "overdue_return" | "gate_exception";
  severity: "info" | "warning" | "critical";
  message: string;
  vehicleId?: string;
  driverId?: string;
  createdAt: string;
}

export interface AuditLogEntry {
  id: string;
  user: string;
  timestamp: string;
  transaction: string;
  previousValue?: string;
  newValue?: string;
  reason?: string;
}

export interface AppUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
}

export type MasterStatus = "active" | "inactive";

interface MasterBase {
  id: string;
  code: string;
  name: string;
  status: MasterStatus;
}

export interface VehicleTypeMaster extends MasterBase {
  description?: string;
}

export interface VehicleMakeMaster extends MasterBase {
  country?: string;
  description?: string;
}

export interface VehicleModelMaster extends MasterBase {
  makeId: string;
  vehicleTypeId: string;
  yearFrom?: number;
}

export interface DepartmentMaster extends MasterBase {
  description?: string;
}

export interface VehiclePurposeMaster extends MasterBase {
  useType: "Official" | "Personal";
  approvalLevel: string;
}

export interface MaintenanceServiceTypeMaster extends MasterBase {
  category: string;
  defaultBasis: "Mileage" | "Time" | "Mileage / Time";
}

export interface EngineOilMaster extends MasterBase {
  brand: string;
  grade: string;
  oilType: "Synthetic" | "Semi Synthetic" | "Mineral";
  packSize: string;
  defaultKm: number;
}

export interface PartConsumableMaster extends MasterBase {
  category: string;
  unit: string;
  defaultLifeKm?: number;
}

export interface WorkshopVendorMaster extends MasterBase {
  vendorType: string;
  contactPerson?: string;
  phone?: string;
}

export interface CostCenterMaster extends MasterBase {
  departmentId: string;
  description?: string;
}

export interface DrivingLicenceTypeMaster extends MasterBase {
  description?: string;
  defaultValidityYears?: number;
}

export interface FuelTypeMaster extends MasterBase {
  unit: string;
  description?: string;
}

export interface GearOilTypeMaster extends MasterBase {
  description?: string;
}

export interface TyreTypeMaster extends MasterBase {
  brand: string;
  size: string;
  typePattern: string;
  plyLoad?: string;
  stdLifeKm?: number;
}

export interface DocumentTypeMaster extends MasterBase {
  category: string;
  defaultAlertDays?: number;
  mandatory: boolean;
}

export interface LocationSiteMaster extends MasterBase {
  address?: string;
}

export interface GateMaster extends MasterBase {
  locationId: string;
  description?: string;
}

export interface Guard {
  id: string;
  guardId: string;
  name: string;
  cnic: string;
  mobile: string;
  department?: string;
  assignedGateId?: string;
  dutyShift?: string;
  guardType: string;
  authorizedExit: boolean;
  authorizedIn: boolean;
  status: "active" | "inactive";
  photoUrl?: string;
}
