import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateMaintenanceThresholds, type MaintenanceThresholds } from "@/services/settings.service";

export function useSettings() {
  return useQuery({ queryKey: ["settings"], queryFn: getSettings });
}

export function useUpdateMaintenanceThresholds() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (patch: Partial<MaintenanceThresholds>) => updateMaintenanceThresholds(patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["settings"] }),
  });
}
