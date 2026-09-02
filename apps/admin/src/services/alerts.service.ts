import type { Alert } from "@/types";
import { apiList, apiPost } from "@/lib/api-client";

export async function listAlerts(): Promise<Alert[]> {
  return apiList<Alert>("/alerts/"); // backend orders -created_at already
}

export type CreateAlertPayload = Omit<Alert, "id" | "createdAt">;

export async function createAlert(payload: CreateAlertPayload): Promise<Alert> {
  return apiPost<Alert>("/alerts/", payload);
}
