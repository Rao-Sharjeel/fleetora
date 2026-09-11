import { KioskShell, PrimaryButton, SuccessBadge, formatTimestamp } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function RecordSavedPage() {
  const vehicle = useEntrySession((s) => s.vehicle);
  const driver = useEntrySession((s) => s.driver);
  const trip = useEntrySession((s) => s.trip);
  const reset = useEntrySession((s) => s.reset);

  if (!vehicle || !driver || !trip) return null;

  // The reading was reported rather than scanned, so say so plainly — the
  // guard should leave knowing the number is still outstanding and who has it.
  const readingReported = trip.odometerIn == null;

  return (
    <KioskShell footer={<PrimaryButton onClick={reset}>Done</PrimaryButton>}>
      <SuccessBadge
        label={readingReported ? "Entry Saved — Reading Reported" : "Entry Record Saved Successfully!"}
      />
      <p className="text-center text-sm text-kiosk-muted">
        {readingReported
          ? "The odometer photo has been sent to an administrator, who will enter the reading."
          : "Thank you."}
      </p>
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row
          label="Closing Odometer"
          value={trip.odometerIn == null ? "Reported — an admin will enter it" : `${trip.odometerIn.toLocaleString()} km`}
        />
        <Row label="Trip KM" value={trip.tripKm == null ? "—" : `${trip.tripKm.toLocaleString()} km`} />
        <Row label="Driver" value={driver.name} />
        <Row label="Time" value={trip.inTime ? formatTimestamp(trip.inTime) : "—"} />
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
