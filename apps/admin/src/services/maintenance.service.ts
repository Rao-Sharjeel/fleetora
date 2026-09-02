import type { MaintenanceRecord } from "@/types";
import { apiList, apiPost } from "@/lib/api-client";

export async function listMaintenanceRecords(): Promise<MaintenanceRecord[]> {
  return apiList<MaintenanceRecord>("/maintenance-records/"); // backend orders -date already
}

export type CreateMaintenancePayload = Omit<MaintenanceRecord, "id">;

export async function createMaintenanceRecord(payload: CreateMaintenancePayload): Promise<MaintenanceRecord> {
  return apiPost<MaintenanceRecord>("/maintenance-records/", payload);
}
