import { useState } from "react";
import { KioskShell, CameraView, decodeQr, recognizeOdometerDigits, getVehicleByCode } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function CaptureOdometerQrPage() {
  const setOdometerResult = useFuelSession((s) => s.setOdometerResult);
  const setStep = useFuelSession((s) => s.setStep);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleCapture(canvas: HTMLCanvasElement, dataUrl: string) {
    setBusy(true);
    setMessage(null);
    try {
      const [qrValue, odometerGuess] = await Promise.all([decodeQr(canvas), recognizeOdometerDigits(canvas)]);

      if (!qrValue) {
        setMessage("QR code not detected. Please retake, keeping the QR code in frame.");
        return;
      }

      const vehicle = await getVehicleByCode(qrValue);
      if (!vehicle) {
        setMessage("This QR code is not linked to a registered vehicle.");
        return;
      }

      setOdometerResult(dataUrl, vehicle, odometerGuess);
      setStep("READING_EXTRACTED");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <KioskShell onBack={() => setStep("DRIVER_IDENTIFIED")}>
      <h1 className="text-lg font-semibold">Capture Odometer & QR Code</h1>
      <p className="text-sm text-kiosk-muted">Please capture odometer and QR code together clearly.</p>
      {message && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{message}</p>}
      {busy ? (
        <div className="flex flex-1 items-center justify-center text-sm text-kiosk-muted">Reading odometer & QR…</div>
      ) : (
        <CameraView variant="frame" hint="Frame the odometer and QR code together" onCapture={handleCapture} />
      )}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={async () => {
            const vehicle = await getVehicleByCode("QR-VEH-001");
            if (vehicle) {
              setOdometerResult("", vehicle, "134800");
              setStep("READING_EXTRACTED");
            }
          }}
          className="text-xs text-kiosk-muted underline"
        >
          Skip (dev): use QR-VEH-001 @ 134800km
        </button>
      )}
    </KioskShell>
  );
}
