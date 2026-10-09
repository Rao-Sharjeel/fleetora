import type { ReactElement } from "react";
import { useExitSession, type ExitStep } from "@/flows/exit/exit-session";
import { SplashPage } from "@/flows/exit/pages/splash-page";
import { ScanGuardPage } from "@/flows/exit/pages/scan-guard-page";
import { GuardIdentifiedPage } from "@/flows/exit/pages/guard-identified-page";
import { ScanVehiclePage } from "@/flows/exit/pages/scan-vehicle-page";
import { NotAllowedBlockedPage } from "@/flows/exit/pages/not-allowed-blocked-page";
import { DoubleExitBlockedPage } from "@/flows/exit/pages/double-exit-blocked-page";
import { NoPlanBlockedPage } from "@/flows/exit/pages/no-plan-blocked-page";
import { PlanExpiredBlockedPage } from "@/flows/exit/pages/plan-expired-blocked-page";
import { TripFoundPage } from "@/flows/exit/pages/trip-found-page";
import { ScanDriverPage } from "@/flows/exit/pages/scan-driver-page";
import { DriverMismatchBlockedPage } from "@/flows/exit/pages/driver-mismatch-blocked-page";
import { DriverIdentifiedPage } from "@/flows/exit/pages/driver-identified-page";
import { CaptureOdometerPage } from "@/flows/exit/pages/capture-odometer-page";
import { ReportOdometerPage } from "@/flows/exit/pages/report-odometer-page";
import { ReadingExtractedPage } from "@/flows/exit/pages/reading-extracted-page";
import { ConfirmSavePage } from "@/flows/exit/pages/confirm-save-page";
import { RecordSavedPage } from "@/flows/exit/pages/record-saved-page";

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

export function ExitFlow() {
  const step = useExitSession((s) => s.step);
  const Page = STEP_PAGES[step];
  return <Page />;
}
