import type { MasterStatus } from "@/types";
import { MASTER_DATA_ENDPOINTS, type MasterDataCollections, type MasterDataKey } from "@/types/master-data";
import { apiDelete, apiList, apiPatch, apiPost } from "@/lib/api-client";

/**
 * One generic list/create/update/remove implementation shared by every master-data
 * setup screen (Vehicle Type, Make, Model, Fuel Type, ...) — they're all "table of
 * code/name/status records with an add/edit dialog" against one of the backend's 17
 * masterdata resources, which are themselves generated from a single factory too.
 */
export function createMasterDataApi<K extends MasterDataKey>(key: K) {
  type Record = MasterDataCollections[K];
  const basePath = `/${MASTER_DATA_ENDPOINTS[key]}/`;

  async function list(): Promise<Record[]> {
    return apiList<Record>(basePath);
  }

  async function create(payload: Omit<Record, "id" | "status"> & { status?: MasterStatus }): Promise<Record> {
    return apiPost<Record>(basePath, payload);
  }

  async function update(id: string, patch: Partial<Record>): Promise<Record> {
    return apiPatch<Record>(`${basePath}${id}/`, patch);
  }

  async function remove(id: string): Promise<void> {
    return apiDelete(`${basePath}${id}/`);
  }

  return { list, create, update, remove };
}
