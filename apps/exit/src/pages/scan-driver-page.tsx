import { ScanIdCardScreen, getDriverByCode, type Driver } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ScanDriverPage() {
  const setDriver = useExitSession((s) => s.setDriver);
  const setStep = useExitSession((s) => s.setStep);

  return (
    <ScanIdCardScreen<Driver>
      title="Scan Driver ID Card"
      subtitle="Please scan the Driver's Fleetora ID card."
      notFoundMessage="Driver ID not recognized. Please try again."
      resolve={async (code) => {
        const driver = await getDriverByCode(code);
        return driver && driver.status === "active" ? driver : undefined;
      }}
      onResolved={setDriver}
      onCancel={() => setStep("GUARD_IDENTIFIED")}
      onBack={() => setStep("GUARD_IDENTIFIED")}
      devSkipCode="EMP-102"
    />
  );
}
