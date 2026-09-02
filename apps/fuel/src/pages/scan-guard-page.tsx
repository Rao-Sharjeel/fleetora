import { ScanIdCardScreen, getGuardByCode, type Guard } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function ScanGuardPage() {
  const setGuard = useFuelSession((s) => s.setGuard);
  const reset = useFuelSession((s) => s.reset);

  return (
    <ScanIdCardScreen<Guard>
      title="Scan Guard ID Card"
      subtitle="Please scan your Fleetora ID card to begin."
      notFoundMessage="Guard ID not recognized. Please try again."
      resolve={async (code) => {
        const guard = await getGuardByCode(code);
        return guard && guard.status === "active" ? guard : undefined;
      }}
      onResolved={setGuard}
      onCancel={reset}
      devSkipCode="GRD-1025"
    />
  );
}
