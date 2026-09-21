import { KioskShell, PrimaryButton, SuccessBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

/**
 * What the Transport Incharge authorized for this vehicle today — purpose,
 * destination, and who's meant to be driving. The guard reads this, then
 * scans the driver's ID to confirm it's actually them (scan-driver-page).
 */
export function TripFoundPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const plan = useExitSession((s) => s.plan);
  const setStep = useExitSession((s) => s.setStep);

  if (!vehicle || !plan) return null;

  return (
    <KioskShell
      onBack={() => setStep("SCAN_VEHICLE")}
      footer={<PrimaryButton onClick={() => setStep("SCAN_DRIVER")}>Scan Driver to Confirm</PrimaryButton>}
    >
      <SuccessBadge label="Trip Authorized" />
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Assigned Driver" value={plan.driverName} />
        <Row label="Purpose" value={plan.purpose} />
        <Row label="Destination" value={plan.destination} />
      </div>
      <p className="text-center text-xs text-kiosk-muted">
        Scan the driver's ID card next — the vehicle can only leave with the driver named above.
      </p>
    </KioskShell>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between p-3 text-sm">
      <span className="text-kiosk-muted">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
