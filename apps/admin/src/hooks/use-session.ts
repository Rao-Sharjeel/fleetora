import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { PermissionCode, UserType } from "@/types";
import { authLogin, authMe, type AuthTokens } from "@/lib/api-client";

interface SessionState {
  userType: UserType;
  roleName: string | null;
  /** Effective permissions (role + direct, with implied views) as the server computed them. */
  permissions: PermissionCode[];
  userName: string;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  login: (username: string, password: string) => Promise<void>;
  /** Re-reads who the user is, so role/permission changes apply without signing out. */
  refreshProfile: () => Promise<void>;
  logout: () => void;
}

const signedOut = {
  userType: "staff" as UserType,
  roleName: null,
  permissions: [],
  userName: "",
  userId: null,
  email: null,
  accessToken: null,
  refreshToken: null,
  isAuthenticated: false,
};

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      ...signedOut,
      setTokens: ({ access, refresh }) =>
        set((state) => ({
          accessToken: access ?? state.accessToken,
          refreshToken: refresh ?? state.refreshToken,
        })),
      login: async (username, password) => {
        const tokens = await authLogin(username, password);
        set({ accessToken: tokens.access, refreshToken: tokens.refresh });
        const me = await authMe();
        set({
          userType: me.userType,
          roleName: me.roleName,
          permissions: me.permissions,
          userName: me.name,
          userId: me.id,
          email: me.email,
          isAuthenticated: true,
        });
      },
      refreshProfile: async () => {
        const me = await authMe();
        set({ userType: me.userType, roleName: me.roleName, permissions: me.permissions, userName: me.name });
      },
      logout: () => set(signedOut),
    }),
    {
      name: "fm-session",
      // v1 stored a single fixed `role`; those sessions have no permissions, so
      // sign them out rather than guess.
      version: 2,
      migrate: () => signedOut as unknown as SessionState,
    },
  ),
);

/** Whether the signed-in user holds `permission`. Admins hold everything. */
export function hasPermission(state: Pick<SessionState, "userType" | "permissions">, permission: PermissionCode) {
  return state.userType === "admin" || state.permissions.includes(permission);
}

/**
 * `const can = useCan(); can("drivers.edit")` — pass several to ask for any of them.
 * Hides actions the server would refuse; the server still enforces every one.
 */
export function useCan() {
  const userType = useSession((s) => s.userType);
  const permissions = useSession((s) => s.permissions);
  return (...anyOf: PermissionCode[]) =>
    userType === "admin" || anyOf.some((p) => permissions.includes(p));
}

export function useIsAdmin() {
  return useSession((s) => s.userType === "admin");
}
