import { ScanIdCardScreen, getDriverByCode, type Driver } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ScanDriverPage() {
  const plan = useExitSession((s) => s.plan);
  const setDriver = useExitSession((s) => s.setDriver);
  const setDriverMismatch = useExitSession((s) => s.setDriverMismatch);
  const setStep = useExitSession((s) => s.setStep);

  return (
    <ScanIdCardScreen<Driver>
      title="Scan Driver ID Card"
      subtitle="Confirm the driver named on the trip — please scan their Fleetora ID card."
      notFoundMessage="Driver ID not recognized. Please try again."
      resolve={async (code) => {
        const driver = await getDriverByCode(code);
        return driver && driver.status === "active" ? driver : undefined;
      }}
      onResolved={(driver) => {
        // The trip only ever opens with the driver the Transport Incharge
        // planned it for — a different (even valid, active) driver is a
        // blocked exit, not a swap made from the gate.
        if (plan && driver.id !== plan.driverId) {
          setDriverMismatch(driver);
          return;
        }
        setDriver(driver);
      }}
      onCancel={() => setStep("TRIP_FOUND")}
      onBack={() => setStep("TRIP_FOUND")}
      devSkipCode="EMP-102"
    />
  );
}
