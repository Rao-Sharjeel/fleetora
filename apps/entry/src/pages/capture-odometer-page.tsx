import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import {
  KioskShell,
  CameraView,
  readOdometerReading,
  readOdometerOnDevice,
  preloadOdometerModel,
  ODOMETER_ATTEMPT_LIMIT,
} from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

/** Digit runs from the vehicle's own QR label. Fleetora's stickers sit on the
 * cluster and were picked up as a candidate on every real photo tested, so the
 * numbers they contain are never a valid odometer reading. */
function qrDigits(...codes: (string | undefined)[]): number[] {
  const out: number[] = [];
  for (const code of codes) {
    for (const run of code?.match(/\d{3,7}/g) ?? []) out.push(Number(run));
  }
  return out;
}

export function CaptureOdometerPage() {
  const setOdometerCapture = useEntrySession((s) => s.setOdometerCapture);
  const setStep = useEntrySession((s) => s.setStep);
  const odometerAttempts = useEntrySession((s) => s.odometerAttempts);
  const countOdometerAttempt = useEntrySession((s) => s.countOdometerAttempt);
  const vehicle = useEntrySession((s) => s.vehicle);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  // Downloading the model on the way into the screen, rather than on the first
  // capture, keeps the wait off the operator's critical path.
  useEffect(() => {
    preloadOdometerModel();
  }, []);

  async function handleCapture(canvas: HTMLCanvasElement, dataUrl: string) {
    setBusy(true);
    setMessage(null);
    countOdometerAttempt();
    // The OCR runs on the main thread, so without giving the browser a frame
    // first the "Reading odometer…" state never gets painted — the camera
    // appeared to stay open for the whole read.
    await new Promise((resolve) => requestAnimationFrame(() => setTimeout(resolve, 0)));
    try {
      // On-device first: it finds and reads the digits anywhere on the
      // cluster, and needs no round trip. The server stays as the fallback for
      // devices where the model won't load.
      const onDevice = await readOdometerOnDevice(canvas, {
        // Anything below the last recorded reading isn't this odometer — it's
        // a trip meter, a dial number, or the vehicle's own QR label, all of
        // which showed up as candidates on real dashboards.
        lastOdometer: vehicle?.currentOdometer,
        excludeValues: qrDigits(vehicle?.registrationNumber, vehicle?.qrCode),
      }).catch(() => null);

      const result = onDevice ?? (await readOdometerReading(dataUrl));
      const reading = result.reading ?? "";
      const confident = Boolean(reading) && result.confident;

      if (!confident) {
        // Nobody here can correct a reading, so an unsure one is not offered
        // for approval — that would just be a guard rubber-stamping a number
        // the reader itself doubts. It counts as a failed attempt instead.
        setMessage("Couldn't read the odometer clearly. Try again from a different angle.");
        setBusy(false);
        return;
      }

      setOdometerCapture(dataUrl, reading, true);
      setStep("READING_EXTRACTED");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <KioskShell onBack={() => setStep("SCAN_VEHICLE")}>
      <h1 className="text-lg font-semibold">Capture Odometer Reading</h1>
      <p className="text-sm text-kiosk-muted">Point the camera at the instrument cluster — the odometer is found automatically.</p>
      {message && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{message}</p>}
      {busy ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 text-sm text-kiosk-muted">
          <Loader2 className="h-8 w-8 animate-spin text-kiosk-accent" />
          Reading odometer…
        </div>
      ) : (
        <CameraView variant="odometer" hint="Get the whole cluster in frame" onCapture={handleCapture} />
      )}
      {!busy && odometerAttempts >= ODOMETER_ATTEMPT_LIMIT && (
        <button
          type="button"
          onClick={() => setStep("REPORT_ODOMETER")}
          className="rounded-xl border border-kiosk-warning/50 bg-kiosk-warning/10 px-4 py-3 text-sm font-medium text-kiosk-warning"
        >
          Can't read this odometer? Report it
        </button>
      )}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => {
            setOdometerCapture("", "83500", true);
            setStep("READING_EXTRACTED");
          }}
          className="text-xs text-kiosk-muted underline"
        >
          Skip (dev): use 83500km
        </button>
      )}
    </KioskShell>
  );
}
