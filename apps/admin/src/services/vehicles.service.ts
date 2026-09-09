import type { Vehicle } from "@/types";
import { ApiError, apiDelete, apiGet, apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listVehicles(): Promise<Vehicle[]> {
  return apiList<Vehicle>("/vehicles/");
}

export type CreateVehiclePayload = Omit<
  Vehicle,
  "id" | "internalId" | "qrCode" | "status" | "allowedToExit" | "photos" | "photoUrl"
> & {
  status?: Vehicle["status"];
  allowedToExit?: boolean;
  /** The gallery reads back as objects but is written as a flat list: an
   * existing photo's id to keep it, or a base64 data URL for a new one, in
   * display order. Omit to leave the gallery untouched; `[]` clears it. */
  photos?: string[];
};

export async function createVehicle(payload: CreateVehiclePayload): Promise<Vehicle> {
  // allowedToExit only ever changes via setAllowedToExit — the backend field is read-only on create.
  const { allowedToExit: _allowedToExit, ...body } = payload;
  return apiPost<Vehicle>("/vehicles/", body);
}

export async function getVehicle(id: string): Promise<Vehicle | undefined> {
  return apiGet<Vehicle>(`/vehicles/${id}/`);
}

export type UpdateVehiclePayload = Partial<CreateVehiclePayload>;

export async function updateVehicle(id: string, patch: UpdateVehiclePayload): Promise<Vehicle> {
  const { allowedToExit: _allowedToExit, ...body } = patch;
  return apiPatch<Vehicle>(`/vehicles/${id}/`, body);
}

export async function deleteVehicle(id: string): Promise<void> {
  return apiDelete(`/vehicles/${id}/`);
}

export async function getVehicleByCode(code: string): Promise<Vehicle | undefined> {
  try {
    return await apiGet<Vehicle>(`/vehicles/by-code/${encodeURIComponent(code)}/`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) return undefined;
    throw err;
  }
}

/** Backend stamps allowedToExitUpdatedBy from the authenticated user and writes the
 * audit-log entry itself (see fleet.views.VehicleViewSet.set_allowed_to_exit) — the
 * caller no longer needs to pass or separately record who made the change. */
export async function setAllowedToExit(vehicleId: string, allowed: boolean, reason: string | undefined): Promise<Vehicle> {
  return apiPost<Vehicle>(`/vehicles/${vehicleId}/set-allowed-to-exit/`, { allowed, reason });
}
