import { useEffect, useState } from "react";
import {
  KioskShell,
  CameraView,
  readOdometerReading,
  readOdometerOnDevice,
  preloadOdometerModel,
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

      if (onDevice) {
        setOdometerCapture(
          dataUrl,
          onDevice.reading,
          onDevice.confident,
          onDevice.digits,
          onDevice.uncertainPositions,
          onDevice.missingTrailingDigit,
        );
      } else {
        // Server fallback has no per-digit detail, so the reading screen falls
        // back to flagging the whole number.
        const { reading, confident } = await readOdometerReading(dataUrl);
        setOdometerCapture(dataUrl, reading ?? "", Boolean(reading) && confident);
      }
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
        <div className="flex flex-1 items-center justify-center text-sm text-kiosk-muted">Reading odometer…</div>
      ) : (
        <CameraView variant="odometer" hint="Get the whole cluster in frame" onCapture={handleCapture} />
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
