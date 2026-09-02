import type { Requisition } from "@/types";
import { apiList, apiPost } from "@/lib/api-client";

export async function listRequisitions(): Promise<Requisition[]> {
  return apiList<Requisition>("/requisitions/"); // backend orders -required_date_time already
}

export type CreateRequisitionPayload = Omit<Requisition, "id" | "requisitionNumber" | "status">;

/** requisitionNumber and status (starts "pending") are server-assigned — status only
 * moves via POST /requisitions/{id}/approve|reject/, not yet wired into this UI. */
export async function createRequisition(payload: CreateRequisitionPayload): Promise<Requisition> {
  return apiPost<Requisition>("/requisitions/", payload);
}
