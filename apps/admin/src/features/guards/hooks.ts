import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createGuard,
  deleteGuard,
  getGuard,
  listGuards,
  updateGuard,
  type CreateGuardPayload,
  type UpdateGuardPayload,
} from "@/services/guards.service";

export function useGuards() {
  return useQuery({ queryKey: ["guards"], queryFn: listGuards });
}

export function useCreateGuard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateGuardPayload) => createGuard(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guards"] }),
  });
}

export function useGuard(id: string | undefined) {
  return useQuery({
    queryKey: ["guards", id],
    queryFn: () => getGuard(id as string),
    enabled: !!id,
  });
}

export function useUpdateGuard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateGuardPayload }) => updateGuard(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["guards"] }),
  });
}

export function useDeleteGuard() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteGuard(id),
    // See useDeleteDriver's comment — same fix, same reason.
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["guards", id] });
      queryClient.invalidateQueries({ queryKey: ["guards"], exact: true });
    },
  });
}
