import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRequisition,
  listRequisitions,
  type CreateRequisitionPayload,
} from "@/services/requisitions.service";

export function useRequisitions() {
  return useQuery({ queryKey: ["requisitions"], queryFn: listRequisitions });
}

export function useCreateRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateRequisitionPayload) => createRequisition(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requisitions"] }),
  });
}
