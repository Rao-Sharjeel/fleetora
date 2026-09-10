import { create } from "zustand";
import type { Guard, Driver, Vehicle, FuelEntry } from "@fleetora/kiosk-core";
import type { DigitReading } from "@fleetora/kiosk-core";

export type FuelStep =
  | "SPLASH"
  | "SCAN_GUARD"
  | "GUARD_IDENTIFIED"
  | "SCAN_DRIVER"
  | "DRIVER_IDENTIFIED"
  | "SCAN_VEHICLE"
  | "CAPTURE_ODOMETER"
  | "READING_EXTRACTED"
  | "FUEL_DETAILS"
  | "CONFIRM_SAVE"
  | "RECORD_SAVED";

interface FuelDetails {
  litres: string;
  ratePerLitre: string;
  fuelStation: string;
  paymentMethod: string;
  fullTank: boolean;
}

interface FuelSessionState {
  step: FuelStep;
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
  details: FuelDetails;
  entry?: FuelEntry;

  setStep: (step: FuelStep) => void;
  setGuard: (guard: Guard) => void;
  setDriver: (driver: Driver) => void;
  setVehicle: (vehicle: Vehicle) => void;
  setOdometerCapture: (photo: string, odometerGuess: string, confident: boolean, digits?: DigitReading[] | null, uncertain?: number[], missingDigit?: boolean) => void;
  setOdometerGuess: (value: string) => void;
  setDetails: (patch: Partial<FuelDetails>) => void;
  setEntry: (entry: FuelEntry) => void;
  reset: () => void;
}

const EMPTY_DETAILS: FuelDetails = {
  litres: "",
  ratePerLitre: "",
  fuelStation: "",
  paymentMethod: "Fuel Card",
  fullTank: true,
};

/** Same single-use contract as Exit and Entry: never persisted, always reset. */
export const useFuelSession = create<FuelSessionState>((set) => ({
  step: "SPLASH",
  odometerGuess: "",
  odometerConfident: true,
  odometerDigits: null,
  odometerUncertain: [],
  odometerMissingDigit: false,
  details: { ...EMPTY_DETAILS },

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
  setDetails: (patch) => set((state) => ({ details: { ...state.details, ...patch } })),
  setEntry: (entry) => set({ entry, step: "RECORD_SAVED" }),
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
      details: { ...EMPTY_DETAILS },
      entry: undefined,
    }),
}));
