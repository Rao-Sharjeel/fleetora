import type { ReactElement } from "react";
import { useEntrySession, type EntryStep } from "@/flows/entry/entry-session";
import { SplashPage } from "@/flows/entry/pages/splash-page";
import { ScanGuardPage } from "@/flows/entry/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/flows/entry/pages/guard-identified-page";
import { ScanDriverPage } from "@/flows/entry/pages/scan-driver-page";
import { DriverIdentifiedPage } from "@/flows/entry/pages/driver-identified-page";
import { ScanVehiclePage } from "@/flows/entry/pages/scan-vehicle-page";
import { CaptureOdometerPage } from "@/flows/entry/pages/capture-odometer-page";
import { ReportOdometerPage } from "@/flows/entry/pages/report-odometer-page";
import { ReadingExtractedPage } from "@/flows/entry/pages/reading-extracted-page";
import { NoOpenTripBlockedPage } from "@/flows/entry/pages/no-open-trip-blocked-page";
import { ReturnConditionPage } from "@/flows/entry/pages/return-condition-page";
import { ConfirmSavePage } from "@/flows/entry/pages/confirm-save-page";
import { RecordSavedPage } from "@/flows/entry/pages/record-saved-page";

const STEP_PAGES: Record<EntryStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  SCAN_VEHICLE: ScanVehiclePage,
  CAPTURE_ODOMETER: CaptureOdometerPage,
  REPORT_ODOMETER: ReportOdometerPage,
  READING_EXTRACTED: ReadingExtractedPage,
  NO_OPEN_TRIP_BLOCKED: NoOpenTripBlockedPage,
  RETURN_CONDITION: ReturnConditionPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export function EntryFlow() {
  const step = useEntrySession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
