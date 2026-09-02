import type { Guard } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listGuards(): Promise<Guard[]> {
  return delay([...getDb().guards]);
}

export type CreateGuardPayload = Omit<Guard, "id" | "status"> & { status?: Guard["status"] };

export async function createGuard(payload: CreateGuardPayload): Promise<Guard> {
  const db = getDb();
  const guard: Guard = {
    ...payload,
    id: nextId("grd"),
    status: payload.status ?? "active",
  };
  db.guards.push(guard);
  commit();
  return delay(guard);
}

export async function getGuard(id: string): Promise<Guard | undefined> {
  return delay(getDb().guards.find((g) => g.id === id));
}

export async function getGuardByCode(code: string): Promise<Guard | undefined> {
  return delay(getDb().guards.find((g) => g.guardId === code));
}
