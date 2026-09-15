import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

export type KioskApp = "exit" | "entry" | "fuel";

export interface KioskDevice {
  id: string;
  name: string;
  app: KioskApp | "";
  active: boolean;
  /** True once some install has claimed this key. A key can be claimed
   * exactly once — see backend/accounts/authentication.py. */
  claimed: boolean;
  claimedAt: string | null;
  /** What the claiming browser reported about itself, e.g. "Android 13 ·
   * Chrome 121" — descriptive only, set by the device at claim time. */
  deviceLabel: string;
  lastSeenAt: string | null;
  createdAt: string;
}

/** Only the create (and reissue) response ever includes this — see backend's
 * KioskDeviceCreateSerializer. There is no way to retrieve it again afterward;
 * once a device claims it, even an admin can't read it back. */
export interface KioskDeviceWithKey extends KioskDevice {
  apiKey: string;
}

export async function listKioskDevices(): Promise<KioskDevice[]> {
  return apiList<KioskDevice>("/kiosk-devices/");
}

export async function createKioskDevice(name: string, app: KioskApp): Promise<KioskDeviceWithKey> {
  return apiPost<KioskDeviceWithKey>("/kiosk-devices/", { name, app });
}

export async function updateKioskDevice(
  id: string,
  patch: Partial<{ name: string; app: KioskApp; active: boolean }>,
): Promise<KioskDevice> {
  return apiPatch<KioskDevice>(`/kiosk-devices/${id}/`, patch);
}

/** Invalidates the current key (claimed or not) and issues a fresh, unclaimed
 * one on the same device record — same name and history, new key to pair.
 * The only way back in for a device that lost its pairing, since a claimed
 * key can never be re-claimed. */
export async function reissueKioskDevice(id: string): Promise<KioskDeviceWithKey> {
  return apiPost<KioskDeviceWithKey>(`/kiosk-devices/${id}/reissue/`);
}

export async function deleteKioskDevice(id: string): Promise<void> {
  return apiDelete(`/kiosk-devices/${id}/`);
}
