import { Gauge } from "lucide-react";
import { KioskShell, PrimaryButton, OdometerDigits } from "@fleetora/kiosk-core";
import { SuccessBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function ReadingExtractedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const odometerGuess = useExitSession((s) => s.odometerGuess);
  const setOdometerGuess = useExitSession((s) => s.setOdometerGuess);
  const odometerConfident = useExitSession((s) => s.odometerConfident);
  const odometerDigits = useExitSession((s) => s.odometerDigits);
  const odometerUncertain = useExitSession((s) => s.odometerUncertain);
  const odometerMissingDigit = useExitSession((s) => s.odometerMissingDigit);
  const odometerPhoto = useExitSession((s) => s.odometerPhoto);
  const setStep = useExitSession((s) => s.setStep);

  if (!vehicle) return null;

  const odometerValid = odometerGuess.trim().length > 0 && Number(odometerGuess) >= vehicle.currentOdometer;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton disabled={!odometerValid} onClick={() => setStep("CONFIRM_SAVE")}>
            Yes, that's correct
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_ODOMETER")}>
            No — retake the photo
          </button>
        </>
      }
    >
      {odometerMissingDigit ? (
        <div className="rounded-2xl border border-kiosk-warning/40 bg-kiosk-warning/10 p-3 text-center text-sm text-kiosk-warning">
          The last digit is between numbers — tap it in below. A new photo won't help.
        </div>
      ) : odometerConfident ? (
        <SuccessBadge label="Reading Extracted" />
      ) : (
        <div className="rounded-2xl border border-kiosk-warning/40 bg-kiosk-warning/10 p-3 text-center text-sm text-kiosk-warning">
          Couldn't read the odometer clearly — check it against the photo below.
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Odometer Reading</span>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-kiosk-success" />
          {odometerDigits && odometerGuess ? (
            <div className="flex-1">
              <OdometerDigits
                value={odometerGuess}
                onChange={setOdometerGuess}
                digits={odometerDigits}
                uncertain={odometerUncertain}
                missingTrailingDigit={odometerMissingDigit}
              />
            </div>
          ) : (
            <>
              <input
                inputMode="numeric"
                value={odometerGuess}
                onChange={(e) => setOdometerGuess(e.target.value.replace(/[^0-9]/g, ""))}
                className="w-full bg-transparent text-2xl font-bold text-kiosk-text outline-none"
              />
              <span className="text-sm text-kiosk-muted">km</span>
            </>
          )}
        </div>
        {!odometerValid && (
          <span className="text-xs text-kiosk-danger">
            Must be at or above the last recorded reading ({vehicle.currentOdometer.toLocaleString()} km).
          </span>
        )}
      </div>

      {/* The captured photo sits next to the number so the operator is
          confirming against what the camera saw, not from memory. */}
      {odometerPhoto && (
        <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
          <span className="text-xs text-kiosk-muted">Does this match the photo?</span>
          <img
            src={odometerPhoto}
            alt="Captured odometer"
            className="max-h-40 w-full rounded-lg object-contain"
          />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Registration No. (from QR)</span>
        <span className="text-lg font-semibold">{vehicle.registrationNumber}</span>
      </div>
    </KioskShell>
  );
}
