import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function GuardIdentifiedPage() {
  const guard = useFuelSession((s) => s.guard);
  const guardCapturedAt = useFuelSession((s) => s.guardCapturedAt);
  const setStep = useFuelSession((s) => s.setStep);

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
