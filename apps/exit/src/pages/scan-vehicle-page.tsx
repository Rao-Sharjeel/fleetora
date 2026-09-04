import { ScanIdCardScreen, getVehicleByCode, createAlert, platesMatch, type Vehicle } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ScanVehiclePage() {
  const plateGuess = useExitSession((s) => s.plateGuess);
  const setVehicle = useExitSession((s) => s.setVehicle);
  const setStep = useExitSession((s) => s.setStep);
  const reset = useExitSession((s) => s.reset);

  return (
    <ScanIdCardScreen<Vehicle>
      title="Scan Vehicle QR Code"
      subtitle="Scan the QR code on the vehicle to identify it."
      notFoundMessage="This QR code is not linked to a registered vehicle."
      resolve={getVehicleByCode}
      onResolved={async (vehicle) => {
        setVehicle(vehicle);

        if (plateGuess.trim() && !platesMatch(plateGuess, vehicle.registrationNumber)) {
          setStep("MISMATCH_BLOCKED");
          return;
        }
        if (!vehicle.allowedToExit) {
          setStep("NOT_ALLOWED_BLOCKED");
          return;
        }
        if (vehicle.status === "outside") {
          await createAlert({
            type: "gate_exception",
            severity: "critical",
            message: `Exit attempted for ${vehicle.registrationNumber}, which is already marked Outside. Possible missed Entry scan.`,
            vehicleId: vehicle.id,
          });
          setStep("DOUBLE_EXIT_BLOCKED");
          return;
        }

        setStep("CAPTURE_ODOMETER");
      }}
      onCancel={reset}
      onBack={() => setStep("FRONT_SAVED")}
      devSkipCode="QR-VEH-001"
    />
  );
}
