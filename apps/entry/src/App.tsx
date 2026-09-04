import type { ReactElement } from "react";
import { useEntrySession, type EntryStep } from "@/state/entry-session";
import { SplashPage } from "@/pages/splash-page";
import { ScanGuardPage } from "@/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/pages/guard-identified-page";
import { ScanDriverPage } from "@/pages/scan-driver-page";
import { DriverIdentifiedPage } from "@/pages/driver-identified-page";
import { ScanVehiclePage } from "@/pages/scan-vehicle-page";
import { CaptureOdometerPage } from "@/pages/capture-odometer-page";
import { ReadingExtractedPage } from "@/pages/reading-extracted-page";
import { NoOpenTripBlockedPage } from "@/pages/no-open-trip-blocked-page";
import { ReturnConditionPage } from "@/pages/return-condition-page";
import { ConfirmSavePage } from "@/pages/confirm-save-page";
import { RecordSavedPage } from "@/pages/record-saved-page";

const STEP_PAGES: Record<EntryStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  SCAN_VEHICLE: ScanVehiclePage,
  CAPTURE_ODOMETER: CaptureOdometerPage,
  READING_EXTRACTED: ReadingExtractedPage,
  NO_OPEN_TRIP_BLOCKED: NoOpenTripBlockedPage,
  RETURN_CONDITION: ReturnConditionPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export default function App() {
  const step = useEntrySession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
