import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createMaintenanceRecord,
  listMaintenanceRecords,
  type CreateMaintenancePayload,
} from "@/services/maintenance.service";

export function useMaintenanceRecords() {
  return useQuery({ queryKey: ["maintenance"], queryFn: listMaintenanceRecords });
}

export function useCreateMaintenanceRecord() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateMaintenancePayload) => createMaintenanceRecord(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["maintenance"] }),
  });
}
