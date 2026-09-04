import { useState } from "react";
import { KioskShell, CameraView, readOdometerReading } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function CaptureOdometerPage() {
  const setOdometerCapture = useExitSession((s) => s.setOdometerCapture);
  const setStep = useExitSession((s) => s.setStep);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCapture(_canvas: HTMLCanvasElement, dataUrl: string) {
    setBusy(true);
    setMessage(null);
    try {
      const { reading } = await readOdometerReading(dataUrl);
      setOdometerCapture(dataUrl, reading ?? "");
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
        <CameraView variant="frame" hint="Fill the frame with the odometer digits" onCapture={handleCapture} />
      )}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={() => {
            setOdometerCapture("", "134700");
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
