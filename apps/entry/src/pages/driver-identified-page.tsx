import { PersonIdentifiedScreen } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function DriverIdentifiedPage() {
  const driver = useEntrySession((s) => s.driver);
  const driverCapturedAt = useEntrySession((s) => s.driverCapturedAt);
  const setStep = useEntrySession((s) => s.setStep);

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
