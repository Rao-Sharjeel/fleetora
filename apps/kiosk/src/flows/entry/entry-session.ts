import { create } from "zustand";
import type { Guard, Driver, Vehicle, Trip } from "@fleetora/kiosk-core";

export type EntryStep =
  | "SPLASH"
  | "SCAN_GUARD"
  | "GUARD_IDENTIFIED"
  | "SCAN_DRIVER"
  | "DRIVER_IDENTIFIED"
  | "SCAN_VEHICLE"
  | "CAPTURE_ODOMETER"
  | "REPORT_ODOMETER"
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
  /** Reads attempted on this vehicle. After ODOMETER_ATTEMPT_LIMIT the guard
   * is offered the "can't read it" route rather than retrying forever. */
  odometerAttempts: number;
  /** Photo of an unreadable odometer, sent in place of a reading. */
  odometerIssuePhoto?: string;
  returnCondition: ReturnCondition;
  remarks: string;
  trip?: Trip;

  setStep: (step: EntryStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setOdometerCapture: (photo: string, odometerGuess: string, confident: boolean) => void;
  countOdometerAttempt: () => void;
  setOdometerIssuePhoto: (photo: string) => void;
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
  odometerAttempts: 0,
  returnCondition: "ok",
  remarks: "",

  setStep: (step) => set({ step }),
  setGuard: (guard) => set({ guard, guardCapturedAt: new Date().toISOString(), step: "GUARD_IDENTIFIED" }),
  setDriver: (driver) => set({ driver, driverCapturedAt: new Date().toISOString(), step: "DRIVER_IDENTIFIED" }),
  setVehicle: (vehicle) => set({ vehicle }),
  setOdometerCapture: (odometerPhoto, odometerGuess, odometerConfident) =>
    set({ odometerPhoto, odometerGuess, odometerConfident }),
  countOdometerAttempt: () => set((s) => ({ odometerAttempts: s.odometerAttempts + 1 })),
  setOdometerIssuePhoto: (odometerIssuePhoto) => set({ odometerIssuePhoto }),
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
      odometerAttempts: 0,
      odometerIssuePhoto: undefined,
      returnCondition: "ok",
      remarks: "",
      trip: undefined,
    }),
}));
