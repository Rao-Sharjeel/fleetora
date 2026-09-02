import type { Requisition } from "@/types";
import { getDb, delay, commit, nextId } from "@/services/mock/db";

export async function listRequisitions(): Promise<Requisition[]> {
  return delay([...getDb().requisitions].sort((a, b) => b.requiredDateTime.localeCompare(a.requiredDateTime)));
}

export type CreateRequisitionPayload = Omit<Requisition, "id" | "requisitionNumber" | "status">;

export async function createRequisition(payload: CreateRequisitionPayload): Promise<Requisition> {
  const db = getDb();
  const requisition: Requisition = {
    ...payload,
    id: nextId("req"),
    requisitionNumber: `REQ-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 8999)}`,
    status: "pending",
  };
  db.requisitions.push(requisition);
  commit();
  return delay(requisition);
}
