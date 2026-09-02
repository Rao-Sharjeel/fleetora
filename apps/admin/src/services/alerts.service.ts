import type { Alert } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listAlerts(): Promise<Alert[]> {
  return delay([...getDb().alerts].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
}

export type CreateAlertPayload = Omit<Alert, "id" | "createdAt">;

export async function createAlert(payload: CreateAlertPayload): Promise<Alert> {
  const db = getDb();
  const alert: Alert = {
    ...payload,
    id: nextId("alrt"),
    createdAt: new Date().toISOString(),
  };
  db.alerts.push(alert);
  commit();
  return delay(alert);
}
