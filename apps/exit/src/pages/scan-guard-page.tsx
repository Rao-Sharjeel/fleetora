import { ScanIdCardScreen, getGuardByCode, type Guard } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ScanGuardPage() {
  const setGuard = useExitSession((s) => s.setGuard);
  const reset = useExitSession((s) => s.reset);

  return (
    <ScanIdCardScreen<Guard>
      title="Scan Guard ID Card"
      subtitle="Please scan your Fleetora ID card to begin."
      notFoundMessage="Guard ID not recognized. Please try again."
      resolve={async (code) => {
        const guard = await getGuardByCode(code);
        return guard && guard.status === "active" ? guard : undefined;
      }}
      validate={(guard) => (guard.authorizedExit ? null : "This guard is not authorized to process exits.")}
      onResolved={setGuard}
      onCancel={reset}
      devSkipCode="GRD-1025"
    />
  );
}
