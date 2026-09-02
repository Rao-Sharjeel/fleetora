import { KioskShell, PrimaryButton, SuccessBadge, formatTimestamp } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function RecordSavedPage() {
  const vehicle = useFuelSession((s) => s.vehicle);
  const driver = useFuelSession((s) => s.driver);
  const entry = useFuelSession((s) => s.entry);
  const reset = useFuelSession((s) => s.reset);

  if (!vehicle || !driver || !entry) return null;

  return (
    <KioskShell footer={<PrimaryButton onClick={reset}>Done</PrimaryButton>}>
      <SuccessBadge label="Fuel Entry Saved Successfully!" />
      <p className="text-center text-sm text-kiosk-muted">Thank you.</p>
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Litres" value={`${entry.litres}`} />
        <Row label="Total" value={entry.total.toLocaleString()} />
        <Row label="Driver" value={driver.name} />
        <Row label="Time" value={formatTimestamp(entry.dateTime)} />
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
