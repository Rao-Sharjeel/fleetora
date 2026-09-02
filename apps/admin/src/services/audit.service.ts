import type { AuditLogEntry } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listAuditLog(): Promise<AuditLogEntry[]> {
  return delay([...getDb().auditLog].sort((a, b) => b.timestamp.localeCompare(a.timestamp)));
}

export type CreateAuditLogEntryPayload = Omit<AuditLogEntry, "id" | "timestamp">;

export async function createAuditLogEntry(payload: CreateAuditLogEntryPayload): Promise<AuditLogEntry> {
  const db = getDb();
  const entry: AuditLogEntry = {
    ...payload,
    id: nextId("audit"),
    timestamp: new Date().toISOString(),
  };
  db.auditLog.push(entry);
  commit();
  return delay(entry);
}
