import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  cancelTripPlan,
  completeGateIn,
  createGateOut,
  getPlannedTripForVehicle,
  listOpenTrips,
  listPlannedTrips,
  listTrips,
  planTrip,
  updateTripPlan,
  type GateInPayload,
  type GateOutPayload,
  type TripPlanPayload,
} from "@/services/trips.service";

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: listTrips });
}

export function useOpenTrips() {
  return useQuery({ queryKey: ["trips", "open"], queryFn: listOpenTrips, refetchInterval: 60_000 });
}

export function usePlannedTrips() {
  return useQuery({ queryKey: ["trips", "planned"], queryFn: listPlannedTrips, refetchInterval: 60_000 });
}

/** Looks up today's plan for a vehicle — used by the office's own Gate-Out
 * screen right after a vehicle scan, same as the exit kiosk. `enabled` so it
 * only fires once a vehicle is actually known. */
export function usePlannedTripForVehicle(vehicleId: string | undefined) {
  return useQuery({
    queryKey: ["trips", "for-vehicle", vehicleId],
    queryFn: () => getPlannedTripForVehicle(vehicleId!),
    enabled: Boolean(vehicleId),
  });
}

function useInvalidateFleetData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };
}

export function usePlanTrip() {
  const invalidate = useInvalidateFleetData();
  return useMutation({
    mutationFn: (payload: TripPlanPayload) => planTrip(payload),
    onSuccess: invalidate,
  });
}

export function useUpdateTripPlan() {
  const invalidate = useInvalidateFleetData();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<TripPlanPayload> }) => updateTripPlan(id, patch),
    onSuccess: invalidate,
  });
}

export function useCancelTripPlan() {
  const invalidate = useInvalidateFleetData();
  return useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) => cancelTripPlan(id, reason),
    onSuccess: invalidate,
  });
}

export function useGateOut() {
  const invalidate = useInvalidateFleetData();
  return useMutation({
    mutationFn: (payload: GateOutPayload) => createGateOut(payload),
    onSuccess: invalidate,
  });
}

export function useGateIn() {
  const invalidate = useInvalidateFleetData();
  return useMutation({
    mutationFn: (payload: GateInPayload) => completeGateIn(payload),
    onSuccess: invalidate,
  });
}
