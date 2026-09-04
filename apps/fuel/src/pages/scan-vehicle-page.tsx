import { ScanIdCardScreen, getVehicleByCode, type Vehicle } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function ScanVehiclePage() {
  const setVehicle = useFuelSession((s) => s.setVehicle);
  const setStep = useFuelSession((s) => s.setStep);
  const reset = useFuelSession((s) => s.reset);

  return (
    <ScanIdCardScreen<Vehicle>
      title="Scan Vehicle QR Code"
      subtitle="Scan the QR code on the vehicle to identify it."
      notFoundMessage="This QR code is not linked to a registered vehicle."
      resolve={getVehicleByCode}
      onResolved={(vehicle) => {
        setVehicle(vehicle);
        setStep("CAPTURE_ODOMETER");
      }}
      onCancel={reset}
      onBack={() => setStep("DRIVER_IDENTIFIED")}
      devSkipCode="QR-VEH-001"
    />
  );
}
