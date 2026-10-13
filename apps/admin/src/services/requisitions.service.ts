import type { Requisition } from "@/types";
import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

export async function listRequisitions(): Promise<Requisition[]> {
  return apiList<Requisition>("/requisitions/"); // backend orders -required_date_time already
}

export type CreateRequisitionPayload = Omit<Requisition, "id" | "requisitionNumber" | "status">;

/** requisitionNumber and status (starts "pending") are server-assigned — status
 * only moves via approve/reject below, never by writing the field. */
export async function createRequisition(payload: CreateRequisitionPayload): Promise<Requisition> {
  return apiPost<Requisition>("/requisitions/", payload);
}

export type UpdateRequisitionPayload = Partial<CreateRequisitionPayload>;

/** Refused with a 409 once the requisition has been approved or rejected —
 * the server decides that, not this UI, which only hides the control. */
export async function updateRequisition(id: string, patch: UpdateRequisitionPayload): Promise<Requisition> {
  return apiPatch<Requisition>(`/requisitions/${id}/`, patch);
}

export async function deleteRequisition(id: string): Promise<void> {
  return apiDelete(`/requisitions/${id}/`);
}

export async function approveRequisition(id: string): Promise<Requisition> {
  return apiPost<Requisition>(`/requisitions/${id}/approve/`);
}

export async function rejectRequisition(id: string): Promise<Requisition> {
  return apiPost<Requisition>(`/requisitions/${id}/reject/`);
}

/** Only a requisition nobody has acted on can be changed or removed. The
 * server enforces this; the UI uses it to avoid offering what would be
 * refused. */
export function isDecided(requisition: Requisition): boolean {
  return requisition.status !== "pending";
}
