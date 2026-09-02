import type { AppUser } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listUsers(): Promise<AppUser[]> {
  return delay([...getDb().users]);
}

export type CreateUserPayload = Omit<AppUser, "id">;

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  const db = getDb();
  const user: AppUser = { ...payload, id: nextId("usr") };
  db.users.push(user);
  commit();
  return delay(user);
}

export async function updateUser(id: string, patch: Partial<Omit<AppUser, "id">>): Promise<AppUser> {
  const db = getDb();
  const user = db.users.find((u) => u.id === id);
  if (!user) throw new Error(`User ${id} not found`);
  Object.assign(user, patch);
  commit();
  return delay(user);
}
