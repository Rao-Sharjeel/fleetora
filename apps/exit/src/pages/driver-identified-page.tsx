import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function DriverIdentifiedPage() {
  const driver = useExitSession((s) => s.driver);
  const driverCapturedAt = useExitSession((s) => s.driverCapturedAt);
  const setStep = useExitSession((s) => s.setStep);

  if (!driver || !driverCapturedAt) return null;

  return (
    <PersonIdentifiedScreen
      label="Driver Identified"
      name={driver.name}
      photoUrl={driver.photoUrl}
      fields={[
        { label: "Driver ID", value: driver.employeeId },
        { label: "License No", value: driver.licenceNumber },
      ]}
      capturedAt={driverCapturedAt}
      onContinue={() => setStep("CAPTURE_FRONT")}
    />
  );
}
