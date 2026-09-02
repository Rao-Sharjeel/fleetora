import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFuelEntry, listFuelEntries, type CreateFuelEntryPayload } from "@/services/fuel.service";

export function useFuelEntries() {
  return useQuery({ queryKey: ["fuel"], queryFn: listFuelEntries });
}

export function useCreateFuelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateFuelEntryPayload) => createFuelEntry(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fuel"] }),
  });
}
