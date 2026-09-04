import { Gauge } from "lucide-react";
import { KioskShell, PrimaryButton, SuccessBadge } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function ReadingExtractedPage() {
  const vehicle = useEntrySession((s) => s.vehicle);
  const odometerGuess = useEntrySession((s) => s.odometerGuess);
  const setOdometerGuess = useEntrySession((s) => s.setOdometerGuess);
  const setStep = useEntrySession((s) => s.setStep);

  if (!vehicle) return null;

  const odometerValid = odometerGuess.trim().length > 0 && Number(odometerGuess) >= vehicle.currentOdometer;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton disabled={!odometerValid} onClick={() => setStep("RETURN_CONDITION")}>
            Continue
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_ODOMETER")}>
            Retake
          </button>
        </>
      }
    >
      <SuccessBadge label="Reading Extracted" />

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Closing Odometer</span>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-kiosk-success" />
          <input
            inputMode="numeric"
            value={odometerGuess}
            onChange={(e) => setOdometerGuess(e.target.value.replace(/[^0-9]/g, ""))}
            className="w-full bg-transparent text-2xl font-bold text-kiosk-text outline-none"
          />
          <span className="text-sm text-kiosk-muted">km</span>
        </div>
        {!odometerValid && (
          <span className="text-xs text-kiosk-danger">
            Must be at or above the opening reading ({vehicle.currentOdometer.toLocaleString()} km).
          </span>
        )}
      </div>

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Registration No. (from QR)</span>
        <span className="text-lg font-semibold">{vehicle.registrationNumber}</span>
      </div>
    </KioskShell>
  );
}
