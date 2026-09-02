import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createGuard, getGuard, listGuards, type CreateGuardPayload } from "@/services/guards.service";

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
