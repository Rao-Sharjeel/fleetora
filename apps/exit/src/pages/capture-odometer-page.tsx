import { useEffect, useState } from "react";
import {
  KioskShell,
  CameraView,
  readOdometerReading,
  readOdometerOnDevice,
  preloadOdometerModel,
} from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function CaptureOdometerPage() {
  const setOdometerCapture = useExitSession((s) => s.setOdometerCapture);
  const setStep = useExitSession((s) => s.setStep);
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
      // On-device first: it reads angled and glare-hit dashboards far more
      // reliably than the server's Tesseract, and needs no round trip. The
      // server stays as the fallback for devices where the model won't load.
      const onDevice = await readOdometerOnDevice(canvas).catch(() => null);
      const { reading, confident } = onDevice
        ? { reading: onDevice.reading, confident: onDevice.confident }
        : await readOdometerReading(dataUrl);
      // A shaky read still gets shown — the operator can correct it — but the
      // reading screen flags it rather than presenting it as a clean read.
      setOdometerCapture(dataUrl, reading ?? "", Boolean(reading) && confident);
      setStep("READING_EXTRACTED");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  return (
    <KioskShell onBack={() => setStep("SCAN_VEHICLE")}>
      <h1 className="text-lg font-semibold">Capture Odometer Reading</h1>
      <p className="text-sm text-kiosk-muted">Fill the frame with just the odometer digits for the clearest read.</p>
      {message && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{message}</p>}
      {busy ? (
        <div className="flex flex-1 items-center justify-center text-sm text-kiosk-muted">Reading odometer…</div>
      ) : (
        <CameraView variant="odometer" hint="Line the odometer digits up inside the box" onCapture={handleCapture} />
      )}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => {
            setOdometerCapture("", "134700", true);
            setStep("READING_EXTRACTED");
          }}
          className="text-xs text-kiosk-muted underline"
        >
          Skip (dev): use 134700km
        </button>
      )}
    </KioskShell>
  );
}
