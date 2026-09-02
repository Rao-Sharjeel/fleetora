import type { Tyre } from "@/types";
import { apiList } from "@/lib/api-client";

export async function listTyres(): Promise<Tyre[]> {
  return apiList<Tyre>("/tyres/");
}
