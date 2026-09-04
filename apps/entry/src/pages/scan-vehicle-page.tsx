import { ScanIdCardScreen, getVehicleByCode, type Vehicle } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function ScanVehiclePage() {
  const setVehicle = useEntrySession((s) => s.setVehicle);
  const setStep = useEntrySession((s) => s.setStep);
  const reset = useEntrySession((s) => s.reset);

  return (
    <ScanIdCardScreen<Vehicle>
      title="Scan Vehicle QR Code"
      subtitle="Scan the QR code on the vehicle to identify it."
      notFoundMessage="This QR code is not linked to a registered vehicle."
      resolve={getVehicleByCode}
      onResolved={(vehicle) => {
        setVehicle(vehicle);
        // A vehicle that isn't marked "outside" has no open trip to close — the
        // mirror image of Exit's double-exit block.
        setStep(vehicle.status === "outside" ? "CAPTURE_ODOMETER" : "NO_OPEN_TRIP_BLOCKED");
      }}
      onCancel={reset}
      onBack={() => setStep("DRIVER_IDENTIFIED")}
      devSkipCode="QR-VEH-002"
    />
  );
}
