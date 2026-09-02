export { configureKiosk, getKioskConfig } from "./config";

export { KioskShell, PrimaryButton, SecondaryButton } from "./components/kiosk-shell";
export { CameraView } from "./components/camera-view";
export { PersonCard } from "./components/person-card";
export { SuccessBadge, BlockedBadge } from "./components/status-badge";
export { ScanIdCardScreen } from "./components/scan-id-card-screen";
export { PersonIdentifiedScreen } from "./components/person-identified-screen";
export { SplashScreen } from "./components/splash-screen";
export { MobileOnlyGate } from "./components/mobile-only-gate";

export { decodeQr } from "./lib/barcode";
export { recognizePlateText, recognizeOdometerDigits } from "./lib/ocr";
export { formatTimestamp } from "./lib/format";
export { normalizePlate, platesMatch } from "./lib/normalize";
export {
  getVehicleByCode,
  getGuardByCode,
  getDriverByCode,
  createGateOut,
  completeGateIn,
  createFuelEntry,
  createAlert,
} from "./lib/bridge-client";

export type {
  Vehicle,
  VehicleStatus,
  Guard,
  Driver,
  Trip,
  ReturnCondition,
  GateOutPayload,
  GateInPayload,
  CreateFuelEntryPayload,
  FuelEntry,
  AlertType,
  AlertSeverity,
  CreateAlertPayload,
} from "./types";
