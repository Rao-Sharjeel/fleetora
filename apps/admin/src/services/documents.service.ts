import type { DocumentRecord, DocumentAlertStatus } from "@/types";
import { getDb, delay } from "@/services/mock/db";

export async function listDocuments(): Promise<DocumentRecord[]> {
  return delay([...getDb().documents].sort((a, b) => a.expiryDate.localeCompare(b.expiryDate)));
}

/** Mirrors spec section 17's 30/15/7-day alert lead times. */
export function documentAlertStatus(expiryDate: string): DocumentAlertStatus {
  const days = Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "ok";
}

export function daysUntil(expiryDate: string): number {
  return Math.floor((new Date(expiryDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}
