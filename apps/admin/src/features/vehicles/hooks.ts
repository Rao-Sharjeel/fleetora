import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createVehicle, getVehicle, listVehicles, setAllowedToExit, type CreateVehiclePayload } from "@/services/vehicles.service";

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
  allowed: boolean;
  reason?: string;
}

/** The backend action itself writes the audit-log entry (stamped from the authenticated
 * user) as part of the same transaction — no separate client-side audit write needed. */
export function useSetAllowedToExit() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ vehicleId, allowed, reason }: SetAllowedToExitInput) => setAllowedToExit(vehicleId, allowed, reason),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      queryClient.invalidateQueries({ queryKey: ["audit"] });
    },
  });
}
