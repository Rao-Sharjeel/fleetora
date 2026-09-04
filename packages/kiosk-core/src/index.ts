export { configureKiosk, getKioskConfig } from "./config";

export { KioskShell, PrimaryButton, SecondaryButton } from "./components/kiosk-shell";
export { CameraView } from "./components/camera-view";
export { PersonCard } from "./components/person-card";
export { SuccessBadge, BlockedBadge } from "./components/status-badge";
export { ScanIdCardScreen } from "./components/scan-id-card-screen";
export { PersonIdentifiedScreen } from "./components/person-identified-screen";
export { SplashScreen } from "./components/splash-screen";
export { MobileOnlyGate } from "./components/mobile-only-gate";
export { DeviceGate } from "./components/device-gate";
export { PairingScreen } from "./components/pairing-screen";
export { InstallBanner } from "./components/install-banner";

export { useInstallPrompt } from "./hooks/use-install-prompt";

export { decodeQr } from "./lib/barcode";
export { recognizePlateText } from "./lib/ocr";
export { formatTimestamp } from "./lib/format";
export { normalizePlate, platesMatch } from "./lib/normalize";
export { ApiError } from "./lib/api-client";
export {
  getVehicleByCode,
  getGuardByCode,
  getDriverByCode,
  createGateOut,
  completeGateIn,
  createFuelEntry,
  createAlert,
  readOdometerReading,
} from "./lib/kiosk-api";

export { useDeviceSession } from "./state/device-session";

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
  OdometerReadingResult,
} from "./types";
