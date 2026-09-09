import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createVehicle,
  deleteVehicle,
  getVehicle,
  listVehicles,
  setAllowedToExit,
  updateVehicle,
  type CreateVehiclePayload,
  type UpdateVehiclePayload,
} from "@/services/vehicles.service";

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

export function useUpdateVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateVehiclePayload }) => updateVehicle(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["vehicles"] }),
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteVehicle(id),
    // See useDeleteDriver's comment (features/drivers/hooks.ts) — plain
    // invalidateQueries(["vehicles"]) prefix-matches the still-mounted
    // ["vehicles", id] detail query and stalls out its retry/backoff before
    // resolving. Evict the detail entry directly instead of refetching it.
    onSuccess: (_data, id) => {
      queryClient.removeQueries({ queryKey: ["vehicles", id] });
      queryClient.invalidateQueries({ queryKey: ["vehicles"], exact: true });
    },
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
