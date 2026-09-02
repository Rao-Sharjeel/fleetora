import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function GuardIdentifiedPage() {
  const guard = useExitSession((s) => s.guard);
  const guardCapturedAt = useExitSession((s) => s.guardCapturedAt);
  const setStep = useExitSession((s) => s.setStep);

  if (!guard || !guardCapturedAt) return null;

  return (
    <PersonIdentifiedScreen
      label="Guard Identified"
      name={guard.name}
      photoUrl={guard.photoUrl}
      fields={[
        { label: "Guard ID", value: guard.guardId },
        { label: "Department", value: guard.department ?? "—" },
      ]}
      capturedAt={guardCapturedAt}
      onContinue={() => setStep("SCAN_DRIVER")}
    />
  );
}
