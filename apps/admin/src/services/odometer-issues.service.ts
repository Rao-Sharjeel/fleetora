import { apiList, apiPost } from "@/lib/api-client";
import type { OdometerIssue } from "@/types";

export async function listOdometerIssues(status?: "pending" | "resolved"): Promise<OdometerIssue[]> {
  return apiList<OdometerIssue>(`/odometer-issues/${status ? `?status=${status}` : ""}`);
}

/** Applies the reading an admin read off the photo. The backend writes it to
 * the trip or fuel entry, moves the vehicle's odometer forward and records an
 * audit entry, all in one transaction. */
export async function resolveOdometerIssue(id: string, reading: number): Promise<OdometerIssue> {
  return apiPost<OdometerIssue>(`/odometer-issues/${id}/resolve/`, { reading });
}
