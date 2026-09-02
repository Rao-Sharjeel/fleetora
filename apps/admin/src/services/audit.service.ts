import type { AuditLogEntry } from "@/types";
import { apiList } from "@/lib/api-client";

/** Read-only — entries are only ever written server-side, as a side effect of the
 * action that made the change (e.g. fleet.views.VehicleViewSet.set_allowed_to_exit). */
export async function listAuditLog(): Promise<AuditLogEntry[]> {
  return apiList<AuditLogEntry>("/audit-log/"); // backend orders -timestamp already
}
