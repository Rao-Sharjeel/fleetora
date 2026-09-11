import { ReportOdometerScreen } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ReportOdometerPage() {
  const attempts = useExitSession((s) => s.odometerAttempts);
  const setOdometerIssuePhoto = useExitSession((s) => s.setOdometerIssuePhoto);
  const setStep = useExitSession((s) => s.setStep);

  return (
    <ReportOdometerScreen
      attempts={attempts}
      onBack={() => setStep("CAPTURE_ODOMETER")}
      onSubmit={(photo) => {
        setOdometerIssuePhoto(photo);
        // Straight on with the flow — the reading is the only thing missing,
        // and holding the vehicle at the gate for a desk response is worse
        // than a trip whose odometer is filled in shortly afterwards.
        setStep("CONFIRM_SAVE");
      }}
    />
  );
}
