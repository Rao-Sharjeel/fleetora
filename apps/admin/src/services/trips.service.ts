import type { Trip, ReturnCondition } from "@/types";
import { apiGet, apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listTrips(): Promise<Trip[]> {
  return apiList<Trip>("/trips/"); // backend orders planned-first, then most recent
}

export async function listOpenTrips(): Promise<Trip[]> {
  return apiList<Trip>("/trips/", { status: "open" });
}

export async function listPlannedTrips(): Promise<Trip[]> {
  return apiList<Trip>("/trips/", { status: "planned" });
}

export async function getOpenTripForVehicle(vehicleId: string): Promise<Trip | undefined> {
  const trips = await apiList<Trip>("/trips/", { vehicle_id: vehicleId, status: "open" });
  return trips[0];
}

export interface PlannedTripLookup {
  trip: Trip | null;
  /** True when a plan exists for this vehicle but its date has passed. */
  expired: boolean;
}

/** The gate's "is this vehicle authorized to leave today?" check — used by the
 * office's own Gate-Out screen the same way the exit kiosk uses it. */
export async function getPlannedTripForVehicle(vehicleId: string): Promise<PlannedTripLookup> {
  return apiGet<PlannedTripLookup>("/trips/for-vehicle/", { vehicle_id: vehicleId });
}

export interface TripPlanPayload {
  vehicleId: string;
  driverId: string;
  purpose: string;
  destination: string;
  requestedBy: string;
  department: string;
  plannedOutTime: string;
  expectedReturn?: string;
  remarks?: string;
}

/** Authorizes a vehicle+driver combination ahead of the gate — the Transport
 * Incharge's Plan Trip action. The gate later only ever confirms this. */
export async function planTrip(payload: TripPlanPayload): Promise<Trip> {
  return apiPost<Trip>("/trips/", payload);
}

export async function updateTripPlan(id: string, patch: Partial<TripPlanPayload>): Promise<Trip> {
  return apiPatch<Trip>(`/trips/${id}/`, patch);
}

export async function cancelTripPlan(id: string, reason?: string): Promise<Trip> {
  return apiPost<Trip>(`/trips/${id}/cancel/`, { reason: reason || undefined });
}

export interface GateOutPayload {
  vehicleId: string;
  driverId: string;
  guardId?: string;
  odometerOut: number;
}

/** Confirms a trip already planned — the vehicle actually left. No duplicate
 * active trip, no odometer regression, vehicle status/odometer updated
 * atomically — all enforced server-side (fleet.views.TripViewSet.gate_out). */
export async function createGateOut(payload: GateOutPayload): Promise<Trip> {
  return apiPost<Trip>("/trips/gate-out/", payload);
}

export interface GateInPayload {
  vehicleId: string;
  odometerIn: number;
  returnCondition: ReturnCondition;
  remarks?: string;
}

/** Keyed by vehicle, not trip — a guard scans the vehicle at the gate, not a trip id
 * they don't know. Requires an open trip, rejects odometer regression, updates the
 * vehicle's status/odometer atomically — all server-side (fleet.views.VehicleViewSet.gate_in). */
export async function completeGateIn(payload: GateInPayload): Promise<Trip> {
  const { vehicleId, ...body } = payload;
  return apiPost<Trip>(`/vehicles/${vehicleId}/gate-in/`, body);
}

export function formatDuration(fromIso: string, toIso?: string): string {
  const from = new Date(fromIso).getTime();
  const to = toIso ? new Date(toIso).getTime() : Date.now();
  const totalMinutes = Math.max(0, Math.floor((to - from) / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
}
