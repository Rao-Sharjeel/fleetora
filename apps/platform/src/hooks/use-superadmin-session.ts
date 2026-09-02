import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SuperAdminSessionState {
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  setTokens: (tokens: { access: string; refresh?: string }) => void;
  logout: () => void;
}

export const useSuperAdminSession = create<SuperAdminSessionState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setTokens: ({ access, refresh }) =>
        set((state) => ({
          accessToken: access,
          refreshToken: refresh ?? state.refreshToken,
          isAuthenticated: true,
        })),
      logout: () => set({ accessToken: null, refreshToken: null, isAuthenticated: false }),
    }),
    { name: "fm-platform-session" },
  ),
);
