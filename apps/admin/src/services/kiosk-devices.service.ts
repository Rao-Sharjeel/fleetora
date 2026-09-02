import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

export interface KioskDevice {
  id: string;
  name: string;
  active: boolean;
  lastSeenAt: string | null;
  createdAt: string;
}

/** Only the create response ever includes this — see backend's
 * KioskDeviceCreateSerializer. There is no way to retrieve it again afterward. */
export interface KioskDeviceWithKey extends KioskDevice {
  apiKey: string;
}

export async function listKioskDevices(): Promise<KioskDevice[]> {
  return apiList<KioskDevice>("/kiosk-devices/");
}

export async function createKioskDevice(name: string): Promise<KioskDeviceWithKey> {
  return apiPost<KioskDeviceWithKey>("/kiosk-devices/", { name });
}

export async function updateKioskDevice(
  id: string,
  patch: Partial<{ name: string; active: boolean }>,
): Promise<KioskDevice> {
  return apiPatch<KioskDevice>(`/kiosk-devices/${id}/`, patch);
}

export async function deleteKioskDevice(id: string): Promise<void> {
  return apiDelete(`/kiosk-devices/${id}/`);
}
