import type { AppSettings, MaintenanceThresholds } from "@/services/mock/db";
import { getDb, delay, commit } from "@/services/mock/db";

export async function getSettings(): Promise<AppSettings> {
  return delay(structuredClone(getDb().settings));
}

export async function updateMaintenanceThresholds(patch: Partial<MaintenanceThresholds>): Promise<AppSettings> {
  const db = getDb();
  Object.assign(db.settings.maintenanceThresholds, patch);
  commit();
  return delay(structuredClone(db.settings));
}
