import type { FuelEntry } from "@/types";
import { apiList, apiPost } from "@/lib/api-client";

export async function listFuelEntries(): Promise<FuelEntry[]> {
  return apiList<FuelEntry>("/fuel-entries/"); // backend orders newest-first already
}

export type CreateFuelEntryPayload = Omit<FuelEntry, "id" | "total" | "dateTime"> & { dateTime?: string };

export async function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  // total is recomputed server-side from litres x rate — never accepted from a client.
  return apiPost<FuelEntry>("/fuel-entries/", payload);
}

export function vehicleFuelStats(vehicleId: string, entries: FuelEntry[], benchmarkKmpl: number) {
  const vehicleEntries = entries.filter((e) => e.vehicleId === vehicleId);
  const litres = vehicleEntries.reduce((sum, e) => sum + e.litres, 0);
  const cost = vehicleEntries.reduce((sum, e) => sum + e.total, 0);
  return { litres, cost, benchmarkKmpl, entryCount: vehicleEntries.length };
}
