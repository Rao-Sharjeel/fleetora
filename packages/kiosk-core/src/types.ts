/**
 * Minimal slice of the main app's data shapes, duplicated here intentionally.
 * Only one kiosk app exists so far — see the plan doc for why a shared
 * package isn't worth introducing yet. Keep this in sync with
 * `src/types/index.ts` and the bridge-exposed functions in the main app.
 */

export type VehicleStatus = "available" | "outside" | "workshop" | "inactive";

export interface Vehicle {
  id: string;
  internalId: string;
  registrationNumber: string;
  make: string;
  model: string;
  currentOdometer: number;
  status: VehicleStatus;
  qrCode: string;
  allowedToExit: boolean;
  allowedToExitReason?: string;
}

export interface Guard {
  id: string;
  guardId: string;
  name: string;
  department?: string;
  photoUrl?: string;
  authorizedExit: boolean;
  authorizedIn: boolean;
  status: "active" | "inactive";
}

export interface Driver {
  id: string;
  employeeId: string;
  name: string;
  companyIdCode?: string;
  licenceNumber: string;
  photoUrl?: string;
  status: "active" | "inactive";
}

export interface GateOutPayload {
  vehicleId: string;
  driverId: string;
  guardId?: string;
  odometerOut: number;
  purpose: string;
  destination: string;
  requestedBy: string;
  department: string;
  expectedReturn?: string;
  remarks?: string;
}

export interface Trip {
  id: string;
  tripNumber: string;
  vehicleId: string;
  driverId: string;
  odometerOut: number;
  odometerIn?: number;
  tripKm?: number;
  outTime: string;
  inTime?: string;
}

export type ReturnCondition = "ok" | "maintenance_required" | "damage_incident";

export interface GateInPayload {
  vehicleId: string;
  odometerIn: number;
  returnCondition: ReturnCondition;
  remarks?: string;
}

export interface CreateFuelEntryPayload {
  vehicleId: string;
  driverId: string;
  odometer: number;
  fuelType: "petrol" | "diesel" | "other";
  litres: number;
  ratePerLitre: number;
  fuelStation: string;
  paymentMethod: string;
  receiptNo?: string;
  fullTank: boolean;
}

export interface FuelEntry extends CreateFuelEntryPayload {
  id: string;
  dateTime: string;
  total: number;
}

export type AlertType = "maintenance" | "tyre" | "document" | "fuel_exception" | "overdue_return" | "gate_exception";
export type AlertSeverity = "info" | "warning" | "critical";

export interface CreateAlertPayload {
  type: AlertType;
  severity: AlertSeverity;
  message: string;
  vehicleId?: string;
  driverId?: string;
}
