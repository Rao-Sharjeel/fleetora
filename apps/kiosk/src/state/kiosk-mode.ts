import { create } from "zustand";
import type { KioskApp } from "@fleetora/kiosk-core";

interface KioskModeState {
  /** Which gate function the guard is part-way through, or null for none. */
  mode: KioskApp | null;
  setMode: (mode: KioskApp | null) => void;
}

/**
 * Deliberately *not* persisted, unlike the device's key.
 *
 * The launcher is the home screen every time: a phone at the gate handles an
 * exit, then an entry, then a refuel, and remembering the last choice would
 * put the guard one wrong tap from filing a fuel entry as a gate-out. Each
 * flow's own session store is equally transient, for the same reason.
 */
export const useKioskMode = create<KioskModeState>()((set) => ({
  mode: null,
  setMode: (mode) => set({ mode }),
}));
