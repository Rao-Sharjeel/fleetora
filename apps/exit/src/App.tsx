import type { ReactElement } from "react";
import { useExitSession, type ExitStep } from "@/state/exit-session";
import { SplashPage } from "@/pages/splash-page";
import { ScanGuardPage } from "@/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/pages/guard-identified-page";
import { ScanDriverPage } from "@/pages/scan-driver-page";
import { DriverIdentifiedPage } from "@/pages/driver-identified-page";
import { CaptureVehicleFrontPage } from "@/pages/capture-vehicle-front-page";
import { FrontPhotoSavedPage } from "@/pages/front-photo-saved-page";
import { ScanVehiclePage } from "@/pages/scan-vehicle-page";
import { CaptureOdometerPage } from "@/pages/capture-odometer-page";
import { ReadingExtractedPage } from "@/pages/reading-extracted-page";
import { MismatchBlockedPage } from "@/pages/mismatch-blocked-page";
import { NotAllowedBlockedPage } from "@/pages/not-allowed-blocked-page";
import { DoubleExitBlockedPage } from "@/pages/double-exit-blocked-page";
import { ConfirmSavePage } from "@/pages/confirm-save-page";
import { RecordSavedPage } from "@/pages/record-saved-page";

const STEP_PAGES: Record<ExitStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  CAPTURE_FRONT: CaptureVehicleFrontPage,
  FRONT_SAVED: FrontPhotoSavedPage,
  SCAN_VEHICLE: ScanVehiclePage,
  CAPTURE_ODOMETER: CaptureOdometerPage,
  READING_EXTRACTED: ReadingExtractedPage,
  MISMATCH_BLOCKED: MismatchBlockedPage,
  NOT_ALLOWED_BLOCKED: NotAllowedBlockedPage,
  DOUBLE_EXIT_BLOCKED: DoubleExitBlockedPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export default function App() {
  const step = useExitSession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
