import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { useEntrySession, type ReturnCondition } from "@/state/entry-session";

const OPTIONS: { value: ReturnCondition; label: string }[] = [
  { value: "ok", label: "OK" },
  { value: "maintenance_required", label: "Maintenance Required" },
  { value: "damage_incident", label: "Damage / Incident" },
];

export function ReturnConditionPage() {
  const returnCondition = useEntrySession((s) => s.returnCondition);
  const setReturnCondition = useEntrySession((s) => s.setReturnCondition);
  const remarks = useEntrySession((s) => s.remarks);
  const setRemarks = useEntrySession((s) => s.setRemarks);
  const setStep = useEntrySession((s) => s.setStep);

  return (
    <KioskShell
      onBack={() => setStep("READING_EXTRACTED")}
      footer={<PrimaryButton onClick={() => setStep("CONFIRM_SAVE")}>Continue</PrimaryButton>}
    >
      <h1 className="text-lg font-semibold">Return Condition</h1>
      <p className="text-sm text-kiosk-muted">How is the vehicle coming back?</p>

      <div className="flex flex-col gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setReturnCondition(option.value)}
            className={`h-12 rounded-xl border text-sm font-medium transition ${
              returnCondition === option.value
                ? "border-kiosk-accent bg-kiosk-accent/10 text-kiosk-text"
                : "border-kiosk-border bg-kiosk-panel text-kiosk-muted"
            }`}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-kiosk-muted">Remarks (optional)</label>
        <input
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="h-11 rounded-xl border border-kiosk-border bg-kiosk-panel px-3 text-base text-kiosk-text outline-none focus:border-kiosk-blue"
          placeholder="Anything worth noting"
        />
      </div>
    </KioskShell>
  );
}
