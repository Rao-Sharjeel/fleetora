import { apiGet, apiPatch } from "@/lib/api-client";

export interface MaintenanceThresholds {
  /** KM remaining at/below which status flips from "normal" to "due_soon". */
  dueSoonKm: number;
  /** KM remaining below which status flips from "due_soon" to "urgent". */
  urgentKm: number;
}

export interface AppSettings {
  maintenanceThresholds: MaintenanceThresholds;
  /** Whether a kiosk disconnect password exists. The value itself is hashed
   * server-side and never served — only its existence is. */
  kioskReleasePasswordSet: boolean;
}

// The backend's /settings/ resource is flat ({dueSoonKm, urgentKm}) — nested here
// under maintenanceThresholds since that's the only settings category today and the
// UI is already built against that shape.
interface SettingsWire extends MaintenanceThresholds {
  kioskReleasePasswordSet: boolean;
}

function fromWire(wire: SettingsWire): AppSettings {
  return {
    maintenanceThresholds: { dueSoonKm: wire.dueSoonKm, urgentKm: wire.urgentKm },
    kioskReleasePasswordSet: wire.kioskReleasePasswordSet,
  };
}

export async function getSettings(): Promise<AppSettings> {
  return fromWire(await apiGet<SettingsWire>("/settings/"));
}

export async function updateMaintenanceThresholds(patch: Partial<MaintenanceThresholds>): Promise<AppSettings> {
  return fromWire(await apiPatch<SettingsWire>("/settings/", patch));
}

/** Sets the password a kiosk must present to unpair itself; "" removes it,
 * which disables disconnecting from the device altogether. */
export async function updateKioskReleasePassword(password: string): Promise<AppSettings> {
  return fromWire(await apiPatch<SettingsWire>("/settings/", { kioskReleasePassword: password }));
}
