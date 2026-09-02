import type { MaintenanceRecord, MaintenanceAlertStatus } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  return delay([...getDb().maintenanceRecords].sort((a, b) => b.date.localeCompare(a.date)));
}

export type CreateMaintenancePayload = Omit<MaintenanceRecord, "id">;

export async function createMaintenanceRecord(payload: CreateMaintenancePayload): Promise<MaintenanceRecord> {
  const db = getDb();
  const record: MaintenanceRecord = { ...payload, id: nextId("mnt") };
  db.maintenanceRecords.push(record);
  commit();
  return delay(record);
}

/** Reads thresholds from Administration > Maintenance Alert Thresholds (spec section 15), kept as one function so they stay configurable in one place. */
export function maintenanceAlertStatus(remainingKm: number): MaintenanceAlertStatus {
  const { urgentKm, dueSoonKm } = getDb().settings.maintenanceThresholds;
  if (remainingKm < 0) return "overdue";
  if (remainingKm < urgentKm) return "urgent";
  if (remainingKm <= dueSoonKm) return "due_soon";
  return "normal";
}
