import { ScanIdCardScreen, getVehicleByCode, getPlannedTripForVehicle, createAlert, type Vehicle } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ScanVehiclePage() {
  const setVehicle = useExitSession((s) => s.setVehicle);
  const setPlan = useExitSession((s) => s.setPlan);
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

        // Every trip is planned by the Transport Incharge before it reaches
        // the gate now — nothing here can originate one.
        const { trip, expired } = await getPlannedTripForVehicle(vehicle.id);
        if (trip) {
          setPlan(trip);
          return;
        }
        setStep(expired ? "PLAN_EXPIRED_BLOCKED" : "NO_PLAN_BLOCKED");
      }}
      onCancel={reset}
      onBack={() => setStep("GUARD_IDENTIFIED")}
      devSkipCode="QR-VEH-001"
    />
  );
}
