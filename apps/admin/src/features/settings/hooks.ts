import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getSettings, updateMaintenanceThresholds } from "@/services/settings.service";
import type { MaintenanceThresholds } from "@/services/mock/db";

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
