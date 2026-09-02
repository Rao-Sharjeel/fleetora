import { useState } from "react";
import { KioskShell, PrimaryButton, completeGateIn } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

const CONDITION_LABELS: Record<string, string> = {
  ok: "OK",
  maintenance_required: "Maintenance Required",
  damage_incident: "Damage / Incident",
};

export function ConfirmSavePage() {
  const guard = useEntrySession((s) => s.guard);
  const driver = useEntrySession((s) => s.driver);
  const vehicle = useEntrySession((s) => s.vehicle);
  const odometerGuess = useEntrySession((s) => s.odometerGuess);
  const returnCondition = useEntrySession((s) => s.returnCondition);
  const remarks = useEntrySession((s) => s.remarks);
  const setTrip = useEntrySession((s) => s.setTrip);
  const reset = useEntrySession((s) => s.reset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!guard || !driver || !vehicle) return null;

  async function handleConfirm() {
    if (!vehicle) return;
    setBusy(true);
    setError(null);
    try {
      const trip = await completeGateIn({
        vehicleId: vehicle.id,
        odometerIn: Number(odometerGuess),
        returnCondition,
        remarks,
      });
      setTrip(trip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the entry record. Please try again.");
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
      <h1 className="text-lg font-semibold">Confirm & Save Entry Record</h1>
      <p className="text-sm text-kiosk-muted">Please review the details before saving the entry record.</p>
      {error && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{error}</p>}
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Guard" value={`${guard.name} (${guard.guardId})`} />
        <Row label="Driver" value={`${driver.name} (${driver.employeeId})`} />
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Closing Odometer" value={`${Number(odometerGuess).toLocaleString()} km`} />
        <Row label="Condition" value={CONDITION_LABELS[returnCondition]} />
        <Row label="Date & Time" value={new Date().toLocaleString()} />
        <Row label="Location" value="Main Gate - Entry" />
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
