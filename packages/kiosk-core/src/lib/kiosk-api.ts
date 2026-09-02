import type {
  Vehicle,
  Guard,
  Driver,
  GateOutPayload,
  GateInPayload,
  CreateFuelEntryPayload,
  FuelEntry,
  Trip,
  CreateAlertPayload,
} from "../types";
import { ApiError, apiGet, apiPost } from "./api-client";

/** Direct calls to the real backend, authenticated as this device (see api-client.ts).
 * Replaces the old postMessage bridge to the admin app — same function names and
 * signatures as before, so no page in any kiosk app needs to change. */

async function byCode<T>(path: string): Promise<T | undefined> {
  try {
    return await apiGet<T>(path);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

export function getVehicleByCode(code: string): Promise<Vehicle | undefined> {
  return byCode<Vehicle>(`/vehicles/by-code/${encodeURIComponent(code)}/`);
}

export function getGuardByCode(code: string): Promise<Guard | undefined> {
  return byCode<Guard>(`/guards/by-code/${encodeURIComponent(code)}/`);
}

export function getDriverByCode(code: string): Promise<Driver | undefined> {
  return byCode<Driver>(`/drivers/by-code/${encodeURIComponent(code)}/`);
}

export function createGateOut(payload: GateOutPayload): Promise<Trip> {
  return apiPost<Trip>("/trips/gate-out/", payload);
}

export function completeGateIn(payload: GateInPayload): Promise<Trip> {
  const { vehicleId, ...body } = payload;
  return apiPost<Trip>(`/vehicles/${vehicleId}/gate-in/`, body);
}

export function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  return apiPost<FuelEntry>("/fuel-entries/", payload);
}

export async function createAlert(payload: CreateAlertPayload): Promise<void> {
  await apiPost("/alerts/", payload);
}
