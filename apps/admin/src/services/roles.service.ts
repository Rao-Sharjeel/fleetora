import type { PermissionCode, PermissionGroup, Role } from "@/types";
import { apiDelete, apiGet, apiList, apiPatch, apiPost } from "@/lib/api-client";

export interface RolePayload {
  name: string;
  description: string;
  permissions: PermissionCode[];
}

export function listRoles(): Promise<Role[]> {
  return apiList<Role>("/auth/roles/");
}

export function createRole(payload: RolePayload): Promise<Role> {
  return apiPost<Role>("/auth/roles/", payload);
}

export function updateRole(id: string, patch: Partial<RolePayload>): Promise<Role> {
  return apiPatch<Role>(`/auth/roles/${id}/`, patch);
}

export function deleteRole(id: string): Promise<void> {
  return apiDelete(`/auth/roles/${id}/`);
}

/** Every permission the backend knows, grouped by screen. */
export function getPermissionCatalog(): Promise<PermissionGroup[]> {
  return apiGet<PermissionGroup[]>("/auth/permissions/");
}
