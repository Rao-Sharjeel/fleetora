import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createMasterDataApi } from "@/services/master-data.service";
import type { MasterDataCollections, MasterDataKey } from "@/types/master-data";
import type { MasterStatus } from "@/types";

export function useMasterCollection<K extends MasterDataKey>(key: K) {
  const api = createMasterDataApi(key);
  return useQuery({ queryKey: ["master-data", key], queryFn: api.list });
}

export function useCreateMasterRecord<K extends MasterDataKey>(key: K) {
  const api = createMasterDataApi(key);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: Omit<MasterDataCollections[K], "id" | "status"> & { status?: MasterStatus }) =>
      api.create(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-data", key] }),
  });
}

export function useUpdateMasterRecord<K extends MasterDataKey>(key: K) {
  const api = createMasterDataApi(key);
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<MasterDataCollections[K]> }) => api.update(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["master-data", key] }),
  });
}
