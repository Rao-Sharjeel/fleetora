import { useState } from "react";
import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { createGateOut } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ConfirmSavePage() {
  const guard = useExitSession((s) => s.guard);
  const driver = useExitSession((s) => s.driver);
  const vehicle = useExitSession((s) => s.vehicle);
  const plan = useExitSession((s) => s.plan);
  const odometerGuess = useExitSession((s) => s.odometerGuess);
  const odometerIssuePhoto = useExitSession((s) => s.odometerIssuePhoto);
  const odometerAttempts = useExitSession((s) => s.odometerAttempts);
  const setTrip = useExitSession((s) => s.setTrip);
  const reset = useExitSession((s) => s.reset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!guard || !driver || !vehicle || !plan) return null;

  async function handleConfirm() {
    if (!guard || !driver || !vehicle) return;
    setBusy(true);
    setError(null);
    try {
      // The trip itself — purpose, destination, who it's for — was already
      // decided when the Transport Incharge planned it. This only confirms
      // the vehicle actually left, with who's driving and the odometer.
      const trip = await createGateOut({
        vehicleId: vehicle.id,
        driverId: driver.id,
        guardId: guard.id,
        // Either a reading or a photo goes up, never both: an unreadable
        // odometer is recorded as absent and resolved by an admin.
        ...(odometerIssuePhoto
          ? { odometerIssuePhoto, odometerIssueAttempts: odometerAttempts }
          : { odometerOut: Number(odometerGuess) }),
      });
      setTrip(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the exit record. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton onClick={handleConfirm} disabled={busy}>
            {busy ? "Saving…" : "Confirm & Save"}
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={reset}>
            Cancel
          </button>
        </>
      }
    >
      <h1 className="text-lg font-semibold">Confirm & Save Exit Record</h1>
      <p className="text-sm text-kiosk-muted">Please review the details before saving the exit record.</p>
      {error && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{error}</p>}
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Guard" value={`${guard.name} (${guard.guardId})`} />
        <Row label="Driver" value={`${driver.name} (${driver.employeeId})`} />
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Purpose" value={plan.purpose} />
        <Row label="Destination" value={plan.destination} />
        <Row
          label="Odometer Reading"
          value={odometerIssuePhoto ? "Reported — an admin will enter it" : `${Number(odometerGuess).toLocaleString()} km`}
        />
        <Row label="Date & Time" value={new Date().toLocaleString()} />
        <Row label="Location" value="Main Gate - Exit" />
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
