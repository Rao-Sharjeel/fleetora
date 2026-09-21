import type { ReactElement } from "react";
import { useExitSession, type ExitStep } from "@/state/exit-session";
import { SplashPage } from "@/pages/splash-page";
import { ScanGuardPage } from "@/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/pages/guard-identified-page";
import { ScanVehiclePage } from "@/pages/scan-vehicle-page";
import { NotAllowedBlockedPage } from "@/pages/not-allowed-blocked-page";
import { DoubleExitBlockedPage } from "@/pages/double-exit-blocked-page";
import { NoPlanBlockedPage } from "@/pages/no-plan-blocked-page";
import { PlanExpiredBlockedPage } from "@/pages/plan-expired-blocked-page";
import { TripFoundPage } from "@/pages/trip-found-page";
import { ScanDriverPage } from "@/pages/scan-driver-page";
import { DriverMismatchBlockedPage } from "@/pages/driver-mismatch-blocked-page";
import { DriverIdentifiedPage } from "@/pages/driver-identified-page";
import { CaptureOdometerPage } from "@/pages/capture-odometer-page";
import { ReportOdometerPage } from "@/pages/report-odometer-page";
import { ReadingExtractedPage } from "@/pages/reading-extracted-page";
import { ConfirmSavePage } from "@/pages/confirm-save-page";
import { RecordSavedPage } from "@/pages/record-saved-page";

// Guard → Vehicle → (plan lookup) → Driver (must match the plan) → Odometer → Confirm.
// A trip's who/why/where are decided by the Transport Incharge before this app
// ever sees it (apps/admin's Trip Register) — the gate only confirms a plan
// that already exists, never originates one. See fleet.serializers.TripPlanSerializer.
const STEP_PAGES: Record<ExitStep, () => ReactElement | null> = {
  SPLASH: SplashPage,
  SCAN_GUARD: ScanGuardPage,
  GUARD_IDENTIFIED: GuardIdentifiedPage,
  SCAN_VEHICLE: ScanVehiclePage,
  NOT_ALLOWED_BLOCKED: NotAllowedBlockedPage,
  DOUBLE_EXIT_BLOCKED: DoubleExitBlockedPage,
  NO_PLAN_BLOCKED: NoPlanBlockedPage,
  PLAN_EXPIRED_BLOCKED: PlanExpiredBlockedPage,
  TRIP_FOUND: TripFoundPage,
  SCAN_DRIVER: ScanDriverPage,
  DRIVER_MISMATCH_BLOCKED: DriverMismatchBlockedPage,
  DRIVER_IDENTIFIED: DriverIdentifiedPage,
  CAPTURE_ODOMETER: CaptureOdometerPage,
  REPORT_ODOMETER: ReportOdometerPage,
  READING_EXTRACTED: ReadingExtractedPage,
  CONFIRM_SAVE: ConfirmSavePage,
  RECORD_SAVED: RecordSavedPage,
};

export default function App() {
  const step = useExitSession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
