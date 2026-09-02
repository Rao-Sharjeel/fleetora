import { apiGet, apiPatch } from "@/lib/api-client";

export interface MaintenanceThresholds {
  /** KM remaining at/below which status flips from "normal" to "due_soon". */
  dueSoonKm: number;
  /** KM remaining below which status flips from "due_soon" to "urgent". */
  urgentKm: number;
}

export interface AppSettings {
  maintenanceThresholds: MaintenanceThresholds;
}

// The backend's /settings/ resource is flat ({dueSoonKm, urgentKm}) — nested here
// under maintenanceThresholds since that's the only settings category today and the
// UI is already built against that shape.
function fromWire(wire: MaintenanceThresholds): AppSettings {
  return { maintenanceThresholds: wire };
}

export async function getSettings(): Promise<AppSettings> {
  return fromWire(await apiGet<MaintenanceThresholds>("/settings/"));
}

export async function updateMaintenanceThresholds(patch: Partial<MaintenanceThresholds>): Promise<AppSettings> {
  return fromWire(await apiPatch<MaintenanceThresholds>("/settings/", patch));
}
