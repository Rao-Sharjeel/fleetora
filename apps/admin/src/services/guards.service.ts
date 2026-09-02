import type { Guard } from "@/types";
import { ApiError, apiGet, apiList, apiPost } from "@/lib/api-client";

export async function listGuards(): Promise<Guard[]> {
  return apiList<Guard>("/guards/");
}

export type CreateGuardPayload = Omit<Guard, "id" | "status"> & { status?: Guard["status"] };

export async function createGuard(payload: CreateGuardPayload): Promise<Guard> {
  return apiPost<Guard>("/guards/", payload);
}

export async function getGuard(id: string): Promise<Guard | undefined> {
  return apiGet<Guard>(`/guards/${id}/`);
}

export async function getGuardByCode(code: string): Promise<Guard | undefined> {
  try {
    return await apiGet<Guard>(`/guards/by-code/${encodeURIComponent(code)}/`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}
