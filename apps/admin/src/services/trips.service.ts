import type { Trip, TripDurationStatus, ReturnCondition } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listTrips(): Promise<Trip[]> {
  return delay([...getDb().trips].sort((a, b) => b.outTime.localeCompare(a.outTime)));
}

export async function listOpenTrips(): Promise<Trip[]> {
  return delay(getDb().trips.filter((t) => t.status === "open"));
}

export function getOpenTripForVehicle(vehicleId: string): Trip | undefined {
  return getDb().trips.find((t) => t.vehicleId === vehicleId && t.status === "open");
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
  approvedBy?: string;
  expectedReturn?: string;
  remarks?: string;
}

/** Mirrors spec section 8 & 28: no duplicate active trip, no odometer regression. */
export async function createGateOut(payload: GateOutPayload): Promise<Trip> {
  const db = getDb();
  const vehicle = db.vehicles.find((v) => v.id === payload.vehicleId);
  if (!vehicle) throw new Error("Vehicle not found.");
  if (vehicle.status === "outside") {
    throw new Error(`${vehicle.registrationNumber} is already outside. Gate-Out is blocked.`);
  }
  if (payload.odometerOut < vehicle.currentOdometer) {
    throw new Error(
      `Odometer OUT (${payload.odometerOut}) is below the last validated reading (${vehicle.currentOdometer}). Authorized override required.`,
    );
  }

  const trip: Trip = {
    id: nextId("trp"),
    tripNumber: `TRP-${new Date().getFullYear()}-${Math.floor(100000 + Math.random() * 899999)}`,
    vehicleId: payload.vehicleId,
    driverId: payload.driverId,
    guardId: payload.guardId,
    purpose: payload.purpose,
    destination: payload.destination,
    requestedBy: payload.requestedBy,
    department: payload.department,
    approvedBy: payload.approvedBy,
    outTime: new Date().toISOString(),
    odometerOut: payload.odometerOut,
    status: "open",
    expectedReturn: payload.expectedReturn,
    remarks: payload.remarks,
  };

  db.trips.push(trip);
  vehicle.status = "outside";
  vehicle.currentOdometer = payload.odometerOut;
  commit();
  return delay(trip);
}

export interface GateInPayload {
  vehicleId: string;
  odometerIn: number;
  returnCondition: ReturnCondition;
  remarks?: string;
}

/** Mirrors spec section 11 & 28: requires an open trip, rejects odometer regression. */
export async function completeGateIn(payload: GateInPayload): Promise<Trip> {
  const db = getDb();
  const trip = db.trips.find((t) => t.vehicleId === payload.vehicleId && t.status === "open");
  if (!trip) throw new Error("No open trip found for this vehicle.");
  if (payload.odometerIn < trip.odometerOut) {
    throw new Error(
      `Closing odometer (${payload.odometerIn}) cannot be below opening odometer (${trip.odometerOut}).`,
    );
  }

  trip.inTime = new Date().toISOString();
  trip.odometerIn = payload.odometerIn;
  trip.tripKm = payload.odometerIn - trip.odometerOut;
  trip.status = "completed";
  trip.returnCondition = payload.returnCondition;
  trip.remarks = payload.remarks ?? trip.remarks;

  const vehicle = db.vehicles.find((v) => v.id === payload.vehicleId);
  if (vehicle) {
    vehicle.currentOdometer = payload.odometerIn;
    vehicle.status = payload.returnCondition === "ok" ? "available" : "workshop";
  }
  commit();
  return delay(trip);
}

export function tripDurationStatus(trip: Trip): TripDurationStatus {
  if (trip.status === "completed") return "normal";
  const minutesOut = (Date.now() - new Date(trip.outTime).getTime()) / 60000;
  if (trip.expectedReturn && Date.now() > new Date(trip.expectedReturn).getTime()) return "overdue";
  if (minutesOut > 240) return "expected_soon";
  return "normal";
}

export function formatDuration(fromIso: string, toIso?: string): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.floor((to - from) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
