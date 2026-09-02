import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createUser, listUsers, updateUser, type CreateUserPayload } from "@/services/users.service";
import type { AppUser } from "@/types";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: listUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<Omit<AppUser, "id">> }) => updateUser(id, patch),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["users"] }),
  });
}
