import { useRef, useState } from "react";
import { KioskShell, CameraView, decodeQr, recognizeOdometerDigits, getVehicleByCode } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function CaptureOdometerQrPage() {
  const setOdometerResult = useEntrySession((s) => s.setOdometerResult);
  const setStep = useEntrySession((s) => s.setStep);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [qrLocked, setQrLocked] = useState(false);
  // Fed by CameraView's background scan — the odometer needs a still frame for
  // OCR so capture stays a manual tap, but the QR doesn't have to be readable
  // in that exact tapped frame: any successful read while framing the shot wins.
  const liveQrRef = useRef<string | null>(null);

  function handleLiveQr(value: string) {
    liveQrRef.current = value;
    setQrLocked(true);
  }

  async function handleCapture(canvas: HTMLCanvasElement, dataUrl: string) {
    setBusy(true);
    setMessage(null);
    const fallbackQr = liveQrRef.current;
    liveQrRef.current = null;
    setQrLocked(false);
    try {
      const [tappedQr, odometerGuess] = await Promise.all([decodeQr(canvas), recognizeOdometerDigits(canvas)]);
      const qrValue = tappedQr ?? fallbackQr;

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

      // A vehicle that isn't marked "outside" has no open trip to close — the
      // mirror image of Exit's double-exit block.
      if (vehicle.status !== "outside") {
        setStep("NO_OPEN_TRIP_BLOCKED");
        return;
      }

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
        <CameraView
          variant="frame"
          hint={qrLocked ? "QR code detected — capture when the odometer is clear" : "Frame the odometer and QR code together"}
          onCapture={handleCapture}
          onDetectQr={handleLiveQr}
        />
      )}
      {import.meta.env.DEV && (
        <button
          type="button"
          onClick={async () => {
            const vehicle = await getVehicleByCode("QR-VEH-002");
            if (vehicle) {
              setOdometerResult("", vehicle, "83500");
              setStep(vehicle.status === "outside" ? "READING_EXTRACTED" : "NO_OPEN_TRIP_BLOCKED");
            }
          }}
          className="text-xs text-kiosk-muted underline"
        >
          Skip (dev): use QR-VEH-002 @ 83500km
        </button>
      )}
    </KioskShell>
  );
}
