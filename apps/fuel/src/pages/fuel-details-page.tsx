import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

const PAYMENT_METHODS = ["Fuel Card", "Cash", "Credit", "Company Account", "Driver Paid", "Other"];

export function FuelDetailsPage() {
  const details = useFuelSession((s) => s.details);
  const setDetails = useFuelSession((s) => s.setDetails);
  const setStep = useFuelSession((s) => s.setStep);

  const litres = Number(details.litres);
  const rate = Number(details.ratePerLitre);
  const total = litres > 0 && rate > 0 ? litres * rate : 0;
  const valid = litres > 0 && rate > 0 && details.fuelStation.trim().length > 0;

  return (
    <KioskShell
      onBack={() => setStep("READING_EXTRACTED")}
      footer={
        <PrimaryButton disabled={!valid} onClick={() => setStep("CONFIRM_SAVE")}>
          Continue
        </PrimaryButton>
      }
    >
      <h1 className="text-lg font-semibold">Fuel Details</h1>
      <p className="text-sm text-kiosk-muted">Enter what was filled.</p>

      <Field label="Litres">
        <input
          inputMode="decimal"
          value={details.litres}
          onChange={(e) => setDetails({ litres: e.target.value.replace(/[^0-9.]/g, "") })}
          className="h-11 w-full rounded-xl border border-kiosk-border bg-kiosk-panel px-3 text-base text-kiosk-text outline-none focus:border-kiosk-blue"
          placeholder="e.g. 45"
        />
      </Field>

      <Field label="Rate per Litre">
        <input
          inputMode="decimal"
          value={details.ratePerLitre}
          onChange={(e) => setDetails({ ratePerLitre: e.target.value.replace(/[^0-9.]/g, "") })}
          className="h-11 w-full rounded-xl border border-kiosk-border bg-kiosk-panel px-3 text-base text-kiosk-text outline-none focus:border-kiosk-blue"
          placeholder="e.g. 289"
        />
      </Field>

      <Field label="Fuel Station">
        <input
          value={details.fuelStation}
          onChange={(e) => setDetails({ fuelStation: e.target.value })}
          className="h-11 w-full rounded-xl border border-kiosk-border bg-kiosk-panel px-3 text-base text-kiosk-text outline-none focus:border-kiosk-blue"
          placeholder="e.g. PSO Gulberg"
        />
      </Field>

      <Field label="Payment Method">
        <div className="flex flex-wrap gap-2">
          {PAYMENT_METHODS.map((method) => (
            <button
              key={method}
              type="button"
              onClick={() => setDetails({ paymentMethod: method })}
              className={`rounded-full border px-3 py-1.5 text-xs transition ${
                details.paymentMethod === method
                  ? "border-kiosk-accent bg-kiosk-accent/10 text-kiosk-text"
                  : "border-kiosk-border bg-kiosk-panel text-kiosk-muted"
              }`}
            >
              {method}
            </button>
          ))}
        </div>
      </Field>

      <label className="flex items-center gap-2 text-sm text-kiosk-muted">
        <input
          type="checkbox"
          checked={details.fullTank}
          onChange={(e) => setDetails({ fullTank: e.target.checked })}
          className="h-4 w-4"
        />
        Full tank
      </label>

      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Total</span>
        <p className="text-2xl font-bold">{total.toLocaleString()}</p>
      </div>
    </KioskShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-sm text-kiosk-muted">{label}</span>
      {children}
    </div>
  );
}
