import type { Tyre } from "@/types";
import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listTyres(): Promise<Tyre[]> {
  return apiList<Tyre>("/tyres/");
}

export type CreateTyrePayload = Omit<Tyre, "id" | "mileage" | "remainingKm">;
export type UpdateTyrePayload = Partial<CreateTyrePayload>;

export async function createTyre(payload: CreateTyrePayload): Promise<Tyre> {
  return apiPost<Tyre>("/tyres/", payload);
}

export async function updateTyre(id: string, patch: UpdateTyrePayload): Promise<Tyre> {
  return apiPatch<Tyre>(`/tyres/${id}/`, patch);
}

export async function deleteTyre(id: string): Promise<void> {
  return apiDelete(`/tyres/${id}/`);
}
