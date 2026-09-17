import type { AppUser, PermissionCode, UserType } from "@/types";
import { apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listUsers(): Promise<AppUser[]> {
  return apiList<AppUser>("/users/");
}

export interface UserPayload {
  name: string;
  email: string;
  userType: UserType;
  roleId: string | null;
  directPermissions: PermissionCode[];
  active: boolean;
  password?: string;
}

export type CreateUserPayload = UserPayload & { password: string };

export async function createUser(payload: CreateUserPayload): Promise<AppUser> {
  return apiPost<AppUser>("/users/", payload);
}

/** password is optional here — omit it to leave the existing password unchanged. */
export async function updateUser(id: string, patch: Partial<UserPayload>): Promise<AppUser> {
  return apiPatch<AppUser>(`/users/${id}/`, patch);
}
