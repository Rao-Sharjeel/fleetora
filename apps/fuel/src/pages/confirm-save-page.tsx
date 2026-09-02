import { useState } from "react";
import { KioskShell, PrimaryButton, createFuelEntry } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function ConfirmSavePage() {
  const guard = useFuelSession((s) => s.guard);
  const driver = useFuelSession((s) => s.driver);
  const vehicle = useFuelSession((s) => s.vehicle);
  const odometerGuess = useFuelSession((s) => s.odometerGuess);
  const details = useFuelSession((s) => s.details);
  const setEntry = useFuelSession((s) => s.setEntry);
  const reset = useFuelSession((s) => s.reset);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!guard || !driver || !vehicle) return null;

  const total = Number(details.litres) * Number(details.ratePerLitre);

  async function handleConfirm() {
    if (!vehicle || !driver) return;
    setBusy(true);
    setError(null);
    try {
      const entry = await createFuelEntry({
        vehicleId: vehicle.id,
        driverId: driver.id,
        odometer: Number(odometerGuess),
        fuelType: "petrol",
        litres: Number(details.litres),
        ratePerLitre: Number(details.ratePerLitre),
        fuelStation: details.fuelStation,
        paymentMethod: details.paymentMethod,
        fullTank: details.fullTank,
      });
      setEntry(entry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the fuel entry. Please try again.");
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
      <h1 className="text-lg font-semibold">Confirm & Save Fuel Entry</h1>
      <p className="text-sm text-kiosk-muted">Please review the details before saving.</p>
      {error && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{error}</p>}
      <div className="flex flex-col divide-y divide-kiosk-border rounded-2xl border border-kiosk-border bg-kiosk-panel">
        <Row label="Guard" value={`${guard.name} (${guard.guardId})`} />
        <Row label="Driver" value={`${driver.name} (${driver.employeeId})`} />
        <Row label="Vehicle No." value={vehicle.registrationNumber} />
        <Row label="Odometer" value={`${Number(odometerGuess).toLocaleString()} km`} />
        <Row label="Litres" value={details.litres} />
        <Row label="Rate/Litre" value={details.ratePerLitre} />
        <Row label="Total" value={total.toLocaleString()} />
        <Row label="Station" value={details.fuelStation} />
        <Row label="Payment" value={details.paymentMethod} />
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
