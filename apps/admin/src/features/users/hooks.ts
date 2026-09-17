import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createUser,
  listUsers,
  updateUser,
  type CreateUserPayload,
  type UserPayload,
} from "@/services/users.service";
import {
  createRole,
  deleteRole,
  getPermissionCatalog,
  listRoles,
  updateRole,
  type RolePayload,
} from "@/services/roles.service";
import { useSession } from "@/hooks/use-session";

export function useUsers() {
  return useQuery({ queryKey: ["users"], queryFn: listUsers });
}

export function useCreateUser() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: CreateUserPayload) => createUser(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
    },
  });
}

export function useUpdateUser() {
  const queryClient = useQueryClient();
  const userId = useSession((s) => s.userId);
  const refreshProfile = useSession((s) => s.refreshProfile);
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: Partial<UserPayload> }) => updateUser(id, patch),
    onSuccess: (_user, { id }) => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      if (id === userId) void refreshProfile();
    },
  });
}

export function useRoles() {
  return useQuery({ queryKey: ["roles"], queryFn: listRoles });
}

export function usePermissionCatalog() {
  // The catalog only changes with a deploy.
  return useQuery({ queryKey: ["permission-catalog"], queryFn: getPermissionCatalog, staleTime: Infinity });
}

export function useSaveRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }: { id?: string; payload: RolePayload }) =>
      id ? updateRole(id, payload) : createRole(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["roles"] });
      // Users' effective permissions change with their role.
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });
}

export function useDeleteRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteRole(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["roles"] }),
  });
}
