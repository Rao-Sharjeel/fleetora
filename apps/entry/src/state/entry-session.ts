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
  returnCondition: ReturnCondition;
  remarks: string;
  trip?: Trip;

  setStep: (step: EntryStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setOdometerCapture: (photo: string, odometerGuess: string) => void;
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
  returnCondition: "ok",
  remarks: "",

  setStep: (step) => set({ step }),
  setGuard: (guard) => set({ guard, guardCapturedAt: new Date().toISOString(), step: "GUARD_IDENTIFIED" }),
  setDriver: (driver) => set({ driver, driverCapturedAt: new Date().toISOString(), step: "DRIVER_IDENTIFIED" }),
  setVehicle: (vehicle) => set({ vehicle }),
  setOdometerCapture: (odometerPhoto, odometerGuess) => set({ odometerPhoto, odometerGuess }),
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
      returnCondition: "ok",
      remarks: "",
      trip: undefined,
    }),
}));
