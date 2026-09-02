import { ScanIdCardScreen, getGuardByCode, type Guard } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function ScanGuardPage() {
  const setGuard = useEntrySession((s) => s.setGuard);
  const reset = useEntrySession((s) => s.reset);

  return (
    <ScanIdCardScreen<Guard>
      title="Scan Guard ID Card"
      subtitle="Please scan your Fleetora ID card to begin."
      notFoundMessage="Guard ID not recognized. Please try again."
      resolve={async (code) => {
        const guard = await getGuardByCode(code);
        return guard && guard.status === "active" ? guard : undefined;
      }}
      validate={(guard) => (guard.authorizedIn ? null : "This guard is not authorized to process entries.")}
      onResolved={setGuard}
      onCancel={reset}
      devSkipCode="GRD-1025"
    />
  );
}
