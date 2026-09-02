import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/types";
import { authLogin, authMe, type AuthTokens } from "@/lib/api-client";

export const ROLES: { id: Role; label: string; description: string }[] = [
  {
    id: "admin",
    label: "Administrator",
    description: "Full configuration, masters, corrections, reports, users, audit.",
  },
  {
    id: "fleet_manager",
    label: "Fleet / Transport Manager",
    description: "Review trips, fuel, maintenance, alerts, performance and reports.",
  },
  {
    id: "gate_guard",
    label: "Gate Security Guard",
    description: "Gate-Out/Gate-In, QR scan, camera capture, odometer entry.",
  },
  {
    id: "management",
    label: "Management",
    description: "Read-only executive dashboard and scheduled reports.",
  },
  {
    id: "driver",
    label: "Driver",
    description: "View assigned trip; upload fuel/emergency repair receipts.",
  },
];

interface SessionState {
  role: Role;
  userName: string;
  userId: string | null;
  email: string | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  /** Dev convenience — lets the RoleSwitcher preview any role's UI without a real login per role. */
  setRole: (role: Role) => void;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

export const useSession = create<SessionState>()(
  persist(
    (set) => ({
      role: "admin",
      userName: "Demo User",
      userId: null,
      email: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      setRole: (role) => set({ role }),
      setTokens: ({ access, refresh }) =>
        set((state) => ({
          accessToken: access ?? state.accessToken,
          refreshToken: refresh ?? state.refreshToken,
        })),
      login: async (username, password) => {
        const tokens = await authLogin(username, password);
        set({ accessToken: tokens.access, refreshToken: tokens.refresh, isAuthenticated: true });
        const me = await authMe();
        set({ role: me.role as Role, userName: me.name, userId: me.id, email: me.email });
      },
      logout: () =>
        set({
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          userId: null,
          email: null,
        }),
    }),
    { name: "fm-session" },
  ),
);
