import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createTyre,
  deleteTyre,
  listTyres,
  updateTyre,
  type CreateTyrePayload,
  type UpdateTyrePayload,
} from "@/services/tyres.service";

export function useTyres() {
  return useQuery({ queryKey: ["tyres"], queryFn: listTyres });
}

export function useCreateTyre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateTyrePayload) => createTyre(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tyres"] }),
  });
}

export function useUpdateTyre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateTyrePayload }) => updateTyre(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tyres"] }),
  });
}

export function useDeleteTyre() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteTyre(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["tyres"] }),
  });
}
