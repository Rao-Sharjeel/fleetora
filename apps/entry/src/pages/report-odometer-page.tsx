import { ReportOdometerScreen } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function ReportOdometerPage() {
  const attempts = useEntrySession((s) => s.odometerAttempts);
  const setOdometerIssuePhoto = useEntrySession((s) => s.setOdometerIssuePhoto);
  const setStep = useEntrySession((s) => s.setStep);

  return (
    <ReportOdometerScreen
      attempts={attempts}
      onBack={() => setStep("CAPTURE_ODOMETER")}
      onSubmit={(photo) => {
        setOdometerIssuePhoto(photo);
        // Straight on with the flow — the reading is the only thing missing,
        // and holding the vehicle at the gate for a desk response is worse
        // than a trip whose odometer is filled in shortly afterwards.
        setStep("RETURN_CONDITION");
      }}
    />
  );
}
