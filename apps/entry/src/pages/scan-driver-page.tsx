import { ScanIdCardScreen, getDriverByCode, type Driver } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function ScanDriverPage() {
  const setDriver = useEntrySession((s) => s.setDriver);
  const setStep = useEntrySession((s) => s.setStep);

  return (
    <ScanIdCardScreen<Driver>
      title="Scan Driver ID Card"
      subtitle="Please scan the returning Driver's Fleetora ID card."
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
