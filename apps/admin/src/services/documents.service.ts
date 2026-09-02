import type { DocumentRecord } from "@/types";
import { apiList } from "@/lib/api-client";

export async function listDocuments(): Promise<DocumentRecord[]> {
  return apiList<DocumentRecord>("/documents/"); // backend orders by expiry_date already
}
