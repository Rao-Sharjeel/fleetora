import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { SuccessBadge } from "@fleetora/kiosk-core";
import { formatTimestamp } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function RecordSavedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const driver = useExitSession((s) => s.driver);
  const trip = useExitSession((s) => s.trip);
  const reset = useExitSession((s) => s.reset);

  if (!vehicle || !driver || !trip) return null;

  return (
    <KioskShell footer={<PrimaryButton onClick={reset}>Done</PrimaryButton>}>
      <SuccessBadge label="Exit Record Saved Successfully!" />
      <p className="text-center text-sm text-kiosk-muted">Thank you.</p>
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Odometer" value={`${trip.odometerOut.toLocaleString()} km`} />
        <Row label="Driver" value={driver.name} />
        <Row label="Time" value={formatTimestamp(trip.outTime)} />
      </div>
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
