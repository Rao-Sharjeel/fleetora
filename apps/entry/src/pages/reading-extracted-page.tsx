import { Gauge } from "lucide-react";
import { KioskShell, PrimaryButton, SuccessBadge } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

/**
 * The scanned reading, to accept or reject — never to edit.
 *
 * Guards cannot correct a reading here, by design: a typed number is exactly
 * what scanning exists to remove, and a guard who can nudge a digit can nudge
 * it anywhere. The only answers are "that matches the photo" or "retake", and
 * after {ODOMETER_ATTEMPT_LIMIT} failed reads the capture screen offers the
 * report route instead, which puts the number in an administrator's hands.
 *
 * Only a confident read reaches this screen — an unsure one is treated as a
 * failed attempt rather than something to rubber-stamp.
 */
export function ReadingExtractedPage() {
  const vehicle = useEntrySession((s) => s.vehicle);
  const odometerGuess = useEntrySession((s) => s.odometerGuess);
  const odometerPhoto = useEntrySession((s) => s.odometerPhoto);
  const setStep = useEntrySession((s) => s.setStep);

  if (!vehicle) return null;

  // A reading below the last recorded one can't be this odometer. There is no
  // correcting it here, so the only way forward is another photo.
  const odometerValid =
    odometerGuess.trim().length > 0 && Number(odometerGuess) >= vehicle.currentOdometer;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton disabled={!odometerValid} onClick={() => setStep("RETURN_CONDITION")}>
            Yes, that's correct
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_ODOMETER")}>
            No — retake the photo
          </button>
        </>
      }
    >
      <SuccessBadge label="Reading Extracted" />

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Closing Odometer</span>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-kiosk-success" />
          <span className="text-3xl font-bold tabular-nums text-kiosk-text">
            {Number(odometerGuess).toLocaleString()}
          </span>
          <span className="text-sm text-kiosk-muted">km</span>
        </div>
        {!odometerValid && (
          <span className="text-xs text-kiosk-danger">
            Below the last recorded reading ({vehicle.currentOdometer.toLocaleString()} km) — retake the photo.
          </span>
        )}
      </div>

      {/* The photo sits beside the number so the guard is checking against
          what the camera saw, not from memory. */}
      {odometerPhoto && (
        <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
          <span className="text-xs text-kiosk-muted">Does this match the photo?</span>
          <img src={odometerPhoto} alt="Captured odometer" className="max-h-40 w-full rounded-lg object-contain" />
        </div>
      )}

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Registration No. (from QR)</span>
        <span className="text-lg font-semibold">{vehicle.registrationNumber}</span>
      </div>
    </KioskShell>
  );
}
