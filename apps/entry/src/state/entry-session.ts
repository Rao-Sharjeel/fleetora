import { create } from "zustand";
import type { Guard, Driver, Vehicle, Trip, DigitReading } from "@fleetora/kiosk-core";

export type EntryStep =
  | "SPLASH"
  | "SCAN_GUARD"
  | "GUARD_IDENTIFIED"
  | "SCAN_DRIVER"
  | "DRIVER_IDENTIFIED"
  | "SCAN_VEHICLE"
  | "CAPTURE_ODOMETER"
  | "READING_EXTRACTED"
  | "NO_OPEN_TRIP_BLOCKED"
  | "RETURN_CONDITION"
  | "CONFIRM_SAVE"
  | "RECORD_SAVED";

export type ReturnCondition = "ok" | "maintenance_required" | "damage_incident";

interface EntrySessionState {
  step: EntryStep;
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
  /** Per-digit readings, so the reading screen can highlight just the position
   * the model was unsure about instead of the whole number. Null when the
   * value came from the server fallback, which has no per-digit detail. */
  odometerDigits: DigitReading[] | null;
  /** Positions (0-based) in odometerGuess that need confirming. */
  odometerUncertain: number[];
  /** True when a trailing digit is missing (drum mid-roll) rather than doubtful. */
  odometerMissingDigit: boolean;
  returnCondition: ReturnCondition;
  remarks: string;
  trip?: Trip;

  setStep: (step: EntryStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setOdometerCapture: (photo: string, odometerGuess: string, confident: boolean, digits?: DigitReading[] | null, uncertain?: number[], missingDigit?: boolean) => void;
  setOdometerGuess: (value: string) => void;
  setReturnCondition: (condition: ReturnCondition) => void;
  setRemarks: (value: string) => void;
  setTrip: (trip: Trip) => void;
  reset: () => void;
}

/** Same single-use contract as Exit: never persisted, fully reset after every
 * terminal state so the next driver never inherits the previous one's session. */
export const useEntrySession = create<EntrySessionState>((set) => ({
  step: "SPLASH",
  odometerGuess: "",
  odometerConfident: true,
  odometerDigits: null,
  odometerUncertain: [],
  odometerMissingDigit: false,
  returnCondition: "ok",
  remarks: "",

  setStep: (step) => set({ step }),
  setGuard: (guard) => set({ guard, guardCapturedAt: new Date().toISOString(), step: "GUARD_IDENTIFIED" }),
  setDriver: (driver) => set({ driver, driverCapturedAt: new Date().toISOString(), step: "DRIVER_IDENTIFIED" }),
  setVehicle: (vehicle) => set({ vehicle }),
  setOdometerCapture: (
    odometerPhoto,
    odometerGuess,
    odometerConfident,
    odometerDigits = null,
    odometerUncertain = [],
    odometerMissingDigit = false,
  ) =>
    set({
      odometerPhoto,
      odometerGuess,
      odometerConfident,
      odometerDigits,
      odometerUncertain,
      odometerMissingDigit,
    }),
  setOdometerGuess: (odometerGuess) => set({ odometerGuess }),
  setReturnCondition: (returnCondition) => set({ returnCondition }),
  setRemarks: (remarks) => set({ remarks }),
  setTrip: (trip) => set({ trip, step: "RECORD_SAVED" }),
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
      odometerDigits: null,
      odometerUncertain: [],
      odometerMissingDigit: false,
      returnCondition: "ok",
      remarks: "",
      trip: undefined,
    }),
}));
