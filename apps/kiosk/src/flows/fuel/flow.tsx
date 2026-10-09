import type { ReactElement } from "react";
import { useFuelSession, type FuelStep } from "@/flows/fuel/fuel-session";
import { SplashPage } from "@/flows/fuel/pages/splash-page";
import { ScanGuardPage } from "@/flows/fuel/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/flows/fuel/pages/guard-identified-page";
import { ScanDriverPage } from "@/flows/fuel/pages/scan-driver-page";
import { DriverIdentifiedPage } from "@/flows/fuel/pages/driver-identified-page";
import { ScanVehiclePage } from "@/flows/fuel/pages/scan-vehicle-page";
import { CaptureOdometerPage } from "@/flows/fuel/pages/capture-odometer-page";
import { ReportOdometerPage } from "@/flows/fuel/pages/report-odometer-page";
import { ReadingExtractedPage } from "@/flows/fuel/pages/reading-extracted-page";
import { FuelDetailsPage } from "@/flows/fuel/pages/fuel-details-page";
import { ConfirmSavePage } from "@/flows/fuel/pages/confirm-save-page";
import { RecordSavedPage } from "@/flows/fuel/pages/record-saved-page";

const STEP_PAGES: Record<FuelStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  SCAN_VEHICLE: ScanVehiclePage,
  CAPTURE_ODOMETER: CaptureOdometerPage,
  REPORT_ODOMETER: ReportOdometerPage,
  READING_EXTRACTED: ReadingExtractedPage,
  FUEL_DETAILS: FuelDetailsPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export function FuelFlow() {
  const step = useFuelSession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
