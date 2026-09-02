import type { AppUser } from "@/types";
import { apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listUsers(): Promise<AppUser[]> {
  return apiList<AppUser>("/users/");
}

export type CreateUserPayload = Omit<AppUser, "id"> & { password: string };

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  return apiPost<AppUser>("/users/", payload);
}

/** password is optional here — omit it to leave the existing password unchanged. */
export async function updateUser(
  id: string,
  patch: Partial<Omit<AppUser, "id">> & { password?: string },
): Promise<AppUser> {
  return apiPatch<AppUser>(`/users/${id}/`, patch);
}
