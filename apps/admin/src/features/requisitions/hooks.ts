import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  approveRequisition,
  createRequisition,
  deleteRequisition,
  listRequisitions,
  rejectRequisition,
  updateRequisition,
  type CreateRequisitionPayload,
  type UpdateRequisitionPayload,
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

export function useUpdateRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: UpdateRequisitionPayload }) => updateRequisition(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requisitions"] }),
  });
}

export function useDeleteRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRequisition(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["requisitions"] }),
  });
}

/** Approving or rejecting also moves what the Trips screen may plan against,
 * so both lists are invalidated. */
export function useDecideRequisition() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, decision }: { id: string; decision: "approve" | "reject" }) =>
      decision === "approve" ? approveRequisition(id) : rejectRequisition(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["requisitions"] });
      queryClient.invalidateQueries({ queryKey: ["trips"] });
    },
  });
}
