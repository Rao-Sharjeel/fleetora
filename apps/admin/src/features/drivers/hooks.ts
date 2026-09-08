import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createDriver,
  deleteDriver,
  getDriver,
  listDrivers,
  updateDriver,
  type CreateDriverPayload,
  type UpdateDriverPayload,
} from "@/services/drivers.service";

export function useDrivers() {
  return useQuery({ queryKey: ["drivers"], queryFn: listDrivers });
}

export function useCreateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateDriverPayload) => createDriver(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDriver(id: string | undefined) {
  return useQuery({
    queryKey: ["drivers", id],
    queryFn: () => getDriver(id as string),
    enabled: !!id,
  });
}

export function useUpdateDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateDriverPayload }) => updateDriver(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drivers"] }),
  });
}

export function useDeleteDriver() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteDriver(id),
    // Not a plain invalidateQueries(["drivers"]) — that prefix-matches ["drivers", id]
    // too, and the profile page's useDriver(id) is typically still mounted (about to
    // navigate away, but hasn't yet) when this fires. Invalidating it would trigger a
    // refetch of a now-404ing detail query, and invalidateQueries' returned promise
    // waits out that query's full retry/backoff before resolving — stalling this
    // mutation (and anything awaiting it, like a post-delete redirect) for seconds.
    // Evict the detail entry directly instead of refetching it, and only invalidate
    // the list key exactly.
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["drivers", id] });
      queryClient.invalidateQueries({ queryKey: ["drivers"], exact: true });
    },
  });
}
