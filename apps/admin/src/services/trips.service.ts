import type { Trip, ReturnCondition } from "@/types";
import { apiList, apiPost } from "@/lib/api-client";

export async function listTrips(): Promise<Trip[]> {
  return apiList<Trip>("/trips/"); // backend orders by -out_time already
}

export async function listOpenTrips(): Promise<Trip[]> {
  return apiList<Trip>("/trips/", { status: "open" });
}

export async function getOpenTripForVehicle(vehicleId: string): Promise<Trip | undefined> {
  const trips = await apiList<Trip>("/trips/", { vehicle_id: vehicleId, status: "open" });
  return trips[0];
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

/** No duplicate active trip, no odometer regression, vehicle status/odometer updated
 * atomically — all enforced server-side now (fleet.views.TripViewSet.gate_out). */
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
