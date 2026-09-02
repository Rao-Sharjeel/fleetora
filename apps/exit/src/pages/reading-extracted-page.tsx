import { Gauge } from "lucide-react";
import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { SuccessBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ReadingExtractedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const odometerGuess = useExitSession((s) => s.odometerGuess);
  const setOdometerGuess = useExitSession((s) => s.setOdometerGuess);
  const setStep = useExitSession((s) => s.setStep);

  if (!vehicle) return null;

  const odometerValid = odometerGuess.trim().length > 0 && Number(odometerGuess) >= vehicle.currentOdometer;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton disabled={!odometerValid} onClick={() => setStep("CONFIRM_SAVE")}>
            Continue
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_ODOMETER_QR")}>
            Retake
          </button>
        </>
      }
    >
      <SuccessBadge label="Reading Extracted" />

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Odometer Reading</span>
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
            Must be at or above the last recorded reading ({vehicle.currentOdometer.toLocaleString()} km).
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
