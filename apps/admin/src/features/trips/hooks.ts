import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  completeGateIn,
  createGateOut,
  listOpenTrips,
  listTrips,
  type GateInPayload,
  type GateOutPayload,
} from "@/services/trips.service";

export function useTrips() {
  return useQuery({ queryKey: ["trips"], queryFn: listTrips });
}

export function useOpenTrips() {
  return useQuery({ queryKey: ["trips", "open"], queryFn: listOpenTrips, refetchInterval: 60_000 });
}

function useInvalidateFleetData() {
  const queryClient = useQueryClient();
  return () => {
    queryClient.invalidateQueries({ queryKey: ["trips"] });
    queryClient.invalidateQueries({ queryKey: ["vehicles"] });
  };
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
