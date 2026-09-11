import { create } from "zustand";
import type { Guard, Driver, Vehicle, Trip } from "@fleetora/kiosk-core";

export type ExitStep =
  | "SPLASH"
  | "SCAN_GUARD"
  | "GUARD_IDENTIFIED"
  | "SCAN_DRIVER"
  | "DRIVER_IDENTIFIED"
  | "SCAN_VEHICLE"
  | "CAPTURE_ODOMETER"
  | "REPORT_ODOMETER"
  | "READING_EXTRACTED"
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
  odometerPhoto?: string;
  odometerGuess: string;
  /** False when the OCR wasn't sure — the reading screen asks the operator to
   * check it rather than presenting a guess as if it were read cleanly. */
  odometerConfident: boolean;
  /** Reads attempted on this vehicle. After ODOMETER_ATTEMPT_LIMIT the guard
   * is offered the "can't read it" route rather than retrying forever. */
  odometerAttempts: number;
  /** Photo of an unreadable odometer, sent in place of a reading. */
  odometerIssuePhoto?: string;
  trip?: Trip;
  error?: string;

  setStep: (step: ExitStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setOdometerCapture: (photo: string, odometerGuess: string, confident: boolean) => void;
  countOdometerAttempt: () => void;
  setOdometerIssuePhoto: (photo: string) => void;
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
  odometerGuess: "",
  odometerConfident: true,
  odometerAttempts: 0,

  setStep: (step) => set({ step }),
  setGuard: (guard) => set({ guard, guardCapturedAt: new Date().toISOString(), step: "GUARD_IDENTIFIED" }),
  setDriver: (driver) => set({ driver, driverCapturedAt: new Date().toISOString(), step: "DRIVER_IDENTIFIED" }),
  setVehicle: (vehicle) => set({ vehicle }),
  setOdometerCapture: (odometerPhoto, odometerGuess, odometerConfident) =>
    set({ odometerPhoto, odometerGuess, odometerConfident }),
  countOdometerAttempt: () => set((s) => ({ odometerAttempts: s.odometerAttempts + 1 })),
  setOdometerIssuePhoto: (odometerIssuePhoto) => set({ odometerIssuePhoto }),
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
          odometerPhoto: undefined,
      odometerGuess: "",
      odometerConfident: true,
      odometerAttempts: 0,
      odometerIssuePhoto: undefined,
      trip: undefined,
      error: undefined,
    }),
}));
