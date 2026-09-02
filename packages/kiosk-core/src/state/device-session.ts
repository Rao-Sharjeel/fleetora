import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DeviceSessionState {
  apiKey: string | null;
  pair: (apiKey: string) => void;
  unpair: () => void;
}

/** Persisted across reloads — a kiosk pairs once, on first launch, and stays
 * paired until an admin revokes the device or someone unpairs it deliberately.
 * Unlike the per-transaction exit/entry/fuel session stores, this is meant to
 * survive indefinitely. */
export const useDeviceSession = create<DeviceSessionState>()(
  persist(
    (set) => ({
      apiKey: null,
      pair: (apiKey) => set({ apiKey }),
      unpair: () => set({ apiKey: null }),
    }),
    { name: "kiosk-device" },
  ),
);
