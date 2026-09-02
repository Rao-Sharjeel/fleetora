import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function GuardIdentifiedPage() {
  const guard = useEntrySession((s) => s.guard);
  const guardCapturedAt = useEntrySession((s) => s.guardCapturedAt);
  const setStep = useEntrySession((s) => s.setStep);

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
