import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVehicle, getVehicle, listVehicles, setAllowedToExit, type CreateVehiclePayload } from "@/services/vehicles.service";
import { createAuditLogEntry } from "@/services/audit.service";

export function useVehicles() {
  return useQuery({ queryKey: ["vehicles"], queryFn: listVehicles });
}

export function useCreateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateVehiclePayload) => createVehicle(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useVehicle(id: string | undefined) {
  return useQuery({
    queryKey: ["vehicles", id],
    queryFn: () => getVehicle(id as string),
    enabled: !!id,
  });
}

export interface SetAllowedToExitInput {
  vehicleId: string;
  registrationNumber: string;
  allowed: boolean;
  reason?: string;
  updatedBy: string;
}

export function useSetAllowedToExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ vehicleId, registrationNumber, allowed, reason, updatedBy }: SetAllowedToExitInput) => {
      const vehicle = await setAllowedToExit(vehicleId, allowed, reason, updatedBy);
      await createAuditLogEntry({
        user: updatedBy,
        transaction: `Exit access changed — ${registrationNumber}`,
        previousValue: allowed ? "Not Allowed to Exit" : "Allowed to Exit",
        newValue: allowed ? "Allowed to Exit" : "Not Allowed to Exit",
        reason,
      });
      return vehicle;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
