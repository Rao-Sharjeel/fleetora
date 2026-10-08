import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createFuelEntry,
  deleteFuelEntry,
  listFuelEntries,
  updateFuelEntry,
  type CreateFuelEntryPayload,
  type UpdateFuelEntryPayload,
} from "@/services/fuel.service";

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

export function useUpdateFuelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateFuelEntryPayload }) => updateFuelEntry(id, patch),
    // Editing litres or rate changes the vehicle's fuel averages, and an edit
    // can resolve the odometer an OdometerIssue was raised for — so this
    // invalidates more than its own list.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      queryClient.invalidateQueries({ queryKey: ["odometer-issues"] });
    },
  });
}

export function useDeleteFuelEntry() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteFuelEntry(id),
    // A delete CASCADEs any OdometerIssue raised against the entry.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["fuel"] });
      queryClient.invalidateQueries({ queryKey: ["odometer-issues"] });
    },
  });
}
