import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function DriverIdentifiedPage() {
  const driver = useFuelSession((s) => s.driver);
  const driverCapturedAt = useFuelSession((s) => s.driverCapturedAt);
  const setStep = useFuelSession((s) => s.setStep);

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
      onContinue={() => setStep("CAPTURE_ODOMETER_QR")}
    />
  );
}
