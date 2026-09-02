import type { ReactElement } from "react";
import { useFuelSession, type FuelStep } from "@/state/fuel-session";
import { SplashPage } from "@/pages/splash-page";
import { ScanGuardPage } from "@/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/pages/guard-identified-page";
import { ScanDriverPage } from "@/pages/scan-driver-page";
import { DriverIdentifiedPage } from "@/pages/driver-identified-page";
import { CaptureOdometerQrPage } from "@/pages/capture-odometer-qr-page";
import { ReadingExtractedPage } from "@/pages/reading-extracted-page";
import { FuelDetailsPage } from "@/pages/fuel-details-page";
import { ConfirmSavePage } from "@/pages/confirm-save-page";
import { RecordSavedPage } from "@/pages/record-saved-page";

const STEP_PAGES: Record<FuelStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  CAPTURE_ODOMETER_QR: CaptureOdometerQrPage,
  READING_EXTRACTED: ReadingExtractedPage,
  FUEL_DETAILS: FuelDetailsPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export default function App() {
  const step = useFuelSession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
