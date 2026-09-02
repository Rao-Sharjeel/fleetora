import { create } from "zustand";
import type { Guard, Driver, Vehicle, Trip } from "@fleetora/kiosk-core";

export type ExitStep =
  | "SPLASH"
  | "SCAN_GUARD"
  | "GUARD_IDENTIFIED"
  | "SCAN_DRIVER"
  | "DRIVER_IDENTIFIED"
  | "CAPTURE_FRONT"
  | "FRONT_SAVED"
  | "CAPTURE_ODOMETER_QR"
  | "READING_EXTRACTED"
  | "MISMATCH_BLOCKED"
  | "NOT_ALLOWED_BLOCKED"
  | "DOUBLE_EXIT_BLOCKED"
  | "CONFIRM_SAVE"
  | "RECORD_SAVED";

interface ExitSessionState {
  step: ExitStep;
  guard?: Guard;
  guardCapturedAt?: string;
  driver?: Driver;
  driverCapturedAt?: string;
  vehicle?: Vehicle;
  frontPhoto?: string;
  plateGuess: string;
  odometerPhoto?: string;
  odometerGuess: string;
  trip?: Trip;
  error?: string;

  setStep: (step: ExitStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setFrontCapture: (photo: string, plateGuess: string) => void;
  setPlateGuess: (value: string) => void;
  setOdometerResult: (photo: string, vehicle: Vehicle, odometerGuess: string) => void;
  setOdometerGuess: (value: string) => void;
  setTrip: (trip: Trip) => void;
  setError: (message: string | undefined) => void;
  reset: () => void;
}

/**
 * Deliberately NOT persisted (no zustand `persist` middleware) — a kiosk session is valid
 * for exactly one exit transaction. `reset()` is called after every terminal state
 * (success or blocked) so the next operator never sees leftover identity/photo data.
 */
export const useExitSession = create<ExitSessionState>((set) => ({
  step: "SPLASH",
  plateGuess: "",
  odometerGuess: "",

  setStep: (step) => set({ step }),
  setGuard: (guard) => set({ guard, guardCapturedAt: new Date().toISOString(), step: "GUARD_IDENTIFIED" }),
  setDriver: (driver) => set({ driver, driverCapturedAt: new Date().toISOString(), step: "DRIVER_IDENTIFIED" }),
  setFrontCapture: (frontPhoto, plateGuess) => set({ frontPhoto, plateGuess, step: "FRONT_SAVED" }),
  setPlateGuess: (plateGuess) => set({ plateGuess }),
  setOdometerResult: (odometerPhoto, vehicle, odometerGuess) => set({ odometerPhoto, vehicle, odometerGuess }),
  setOdometerGuess: (odometerGuess) => set({ odometerGuess }),
  setTrip: (trip) => set({ trip, step: "RECORD_SAVED" }),
  setError: (error) => set({ error }),
  reset: () =>
    set({
      step: "SPLASH",
      guard: undefined,
      guardCapturedAt: undefined,
      driver: undefined,
      driverCapturedAt: undefined,
      vehicle: undefined,
      frontPhoto: undefined,
      plateGuess: "",
      odometerPhoto: undefined,
      odometerGuess: "",
      trip: undefined,
      error: undefined,
    }),
}));
