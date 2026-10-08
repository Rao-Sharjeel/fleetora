import type { FuelEntry } from "@/types";
import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

export const PAYMENT_METHODS = ["Cash", "Credit", "Fuel Card", "Company Account", "Driver Paid", "Other"];

export async function listFuelEntries(): Promise<FuelEntry[]> {
  return apiList<FuelEntry>("/fuel-entries/"); // backend orders newest-first already
}

export type CreateFuelEntryPayload = Omit<FuelEntry, "id" | "total" | "dateTime"> & { dateTime?: string };

export async function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  // total is recomputed server-side from litres x rate — never accepted from a client.
  return apiPost<FuelEntry>("/fuel-entries/", payload);
}

export type UpdateFuelEntryPayload = Partial<Omit<FuelEntry, "id" | "total">>;

export async function updateFuelEntry(id: string, patch: UpdateFuelEntryPayload): Promise<FuelEntry> {
  return apiPatch<FuelEntry>(`/fuel-entries/${id}/`, patch);
}

export async function deleteFuelEntry(id: string): Promise<void> {
  return apiDelete(`/fuel-entries/${id}/`);
}

export function vehicleFuelStats(vehicleId: string, entries: FuelEntry[], benchmarkKmpl: number) {
  const vehicleEntries = entries.filter((e) => e.vehicleId === vehicleId);
  const litres = vehicleEntries.reduce((sum, e) => sum + e.litres, 0);
  const cost = vehicleEntries.reduce((sum, e) => sum + e.total, 0);
  return { litres, cost, benchmarkKmpl, entryCount: vehicleEntries.length };
}
