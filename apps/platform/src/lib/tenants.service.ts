import { apiList, apiPost } from "./api-client";

export interface Tenant {
  id: string;
  schemaName: string;
  name: string;
  domain: string | null;
  createdAt: string;
}

export interface CreateTenantPayload {
  schemaName: string;
  name: string;
  domain: string;
  adminEmail: string;
  adminPassword: string;
}

export function listTenants(): Promise<Tenant[]> {
  return apiList<Tenant>("/tenants/");
}

export function createTenant(payload: CreateTenantPayload): Promise<Tenant> {
  return apiPost<Tenant>("/tenants/", payload);
}
