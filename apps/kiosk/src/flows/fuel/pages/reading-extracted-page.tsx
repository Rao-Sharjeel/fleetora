import { Gauge } from "lucide-react";
import { KioskShell, OdometerDigits, PrimaryButton, SuccessBadge } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/flows/fuel/fuel-session";

/**
 * The scanned reading, to accept or reject — never to edit.
 *
 * Guards cannot correct a reading here, by design: a typed number is exactly
 * what scanning exists to remove, and a guard who can nudge a digit can nudge
 * it anywhere. The only answers are "that matches the photo" or "retake", and
 * after {ODOMETER_ATTEMPT_LIMIT} failed reads the capture screen offers the
 * report route instead, which puts the number in an administrator's hands.
 *
 * An unsure read now reaches this screen too, with the doubted digits marked
 * and a differently-worded confirmation. It used to be discarded outright, on
 * the reasoning that a guard who cannot edit should not rubber-stamp — but
 * this screen already shows the photo beside the number and asks whether they
 * match, which is exactly the check a marginal digit needs. Discarding the
 * whole reading over one glyph bought no safety and cost correct readings.
 */
export function ReadingExtractedPage() {
  const vehicle = useFuelSession((s) => s.vehicle);
  const odometerGuess = useFuelSession((s) => s.odometerGuess);
  const odometerConfident = useFuelSession((s) => s.odometerConfident);
  const odometerUncertain = useFuelSession((s) => s.odometerUncertain);
  const odometerPhoto = useFuelSession((s) => s.odometerPhoto);
  const setStep = useFuelSession((s) => s.setStep);

  if (!vehicle) return null;

  // A reading below the last recorded one can't be this odometer. There is no
  // correcting it here, so the only way forward is another photo.
  const odometerValid =
    odometerGuess.trim().length > 0 && Number(odometerGuess) >= vehicle.currentOdometer;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton disabled={!odometerValid} onClick={() => setStep("FUEL_DETAILS")}>
            {odometerConfident ? "Yes, that's correct" : "I've checked it — this is correct"}
          </PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_ODOMETER")}>
            No — retake the photo
          </button>
        </>
      }
    >
      <SuccessBadge label="Reading Extracted" />

      <div className="flex flex-col gap-2 rounded-2xl border border-kiosk-border bg-kiosk-panel p-4">
        <span className="text-xs text-kiosk-muted">Odometer Reading</span>
        <div className="flex items-center gap-2">
          <Gauge className="h-6 w-6 text-kiosk-success" />
          <OdometerDigits reading={odometerGuess} uncertainPositions={odometerUncertain} />
          <span className="text-sm text-kiosk-muted">km</span>
        </div>
        {!odometerConfident && odometerUncertain.length > 0 && (
          <span className="text-xs text-kiosk-warning">
            The marked {odometerUncertain.length === 1 ? "digit was" : "digits were"} hard to read. Check{" "}
            {odometerUncertain.length === 1 ? "it" : "them"} against the photo before confirming.
          </span>
        )}
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
