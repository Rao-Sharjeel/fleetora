import type { FuelEntry } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listFuelEntries(): Promise<FuelEntry[]> {
  return delay([...getDb().fuelEntries].sort((a, b) => b.dateTime.localeCompare(a.dateTime)));
}

export type CreateFuelEntryPayload = Omit<FuelEntry, "id" | "total" | "dateTime"> & { dateTime?: string };

export async function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  const db = getDb();
  const entry: FuelEntry = {
    ...payload,
    id: nextId("fuel"),
    dateTime: payload.dateTime ?? new Date().toISOString(),
    total: payload.litres * payload.ratePerLitre,
  };
  db.fuelEntries.push(entry);
  commit();
  return delay(entry);
}

export function vehicleFuelStats(vehicleId: string, entries: FuelEntry[], benchmarkKmpl: number) {
  const vehicleEntries = entries.filter((e) => e.vehicleId === vehicleId);
  const litres = vehicleEntries.reduce((sum, e) => sum + e.litres, 0);
  const cost = vehicleEntries.reduce((sum, e) => sum + e.total, 0);
  return { litres, cost, benchmarkKmpl, entryCount: vehicleEntries.length };
}
