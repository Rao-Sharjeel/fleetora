import { useRef, useState } from "react";
import { KioskShell } from "@fleetora/kiosk-core";
import { CameraView } from "@fleetora/kiosk-core";
import { decodeQr } from "@fleetora/kiosk-core";
import { recognizeOdometerDigits } from "@fleetora/kiosk-core";
import { getVehicleByCode, createAlert } from "@fleetora/kiosk-core";
import { platesMatch } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function CaptureOdometerQrPage() {
  const plateGuess = useExitSession((s) => s.plateGuess);
  const setOdometerResult = useExitSession((s) => s.setOdometerResult);
  const setStep = useExitSession((s) => s.setStep);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [qrLocked, setQrLocked] = useState(false);
  // Fed by CameraView's background scan (see handleCapture) — the odometer
  // needs a still frame for OCR, so capture stays a manual tap, but the QR
  // half doesn't have to be readable in that *exact* tapped frame: as long as
  // it decoded at any point while framing the shot, that reading wins. A QR
  // sticker on glass with glare crossing it, like the one from the field
  // photo that prompted this, often only reads clean for a frame or two.
  const liveQrRef = useRef<string | null>(null);

  async function resolveVehicle(qrValue: string, odometerGuess: string, dataUrl: string) {
    setBusy(true);
    setMessage(null);
    try {
      const vehicle = await getVehicleByCode(qrValue);
      if (!vehicle) {
        setMessage("This QR code is not linked to a registered vehicle.");
        return;
      }

      setOdometerResult(dataUrl, vehicle, odometerGuess);

      if (plateGuess.trim() && !platesMatch(plateGuess, vehicle.registrationNumber)) {
        setStep("MISMATCH_BLOCKED");
        return;
      }

      if (!vehicle.allowedToExit) {
        setStep("NOT_ALLOWED_BLOCKED");
        return;
      }

      if (vehicle.status === "outside") {
        await createAlert({
          type: "gate_exception",
          severity: "critical",
          message: `Exit attempted for ${vehicle.registrationNumber}, which is already marked Outside. Possible missed Entry scan.`,
          vehicleId: vehicle.id,
        });
        setStep("DOUBLE_EXIT_BLOCKED");
        return;
      }

      setStep("READING_EXTRACTED");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

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
    const [tappedQr, odometerGuess] = await Promise.all([decodeQr(canvas), recognizeOdometerDigits(canvas)]);
    const qrValue = tappedQr ?? fallbackQr;
    if (!qrValue) {
      setMessage("QR code not detected. Please retake, keeping the QR code in frame.");
      setBusy(false);
      return;
    }
    await resolveVehicle(qrValue, odometerGuess, dataUrl);
  }

  return (
    <KioskShell onBack={() => setStep("FRONT_SAVED")}>
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
          onClick={() => resolveVehicle("QR-VEH-001", "134700", "")}
          className="text-xs text-kiosk-muted underline"
        >
          Skip (dev): use QR-VEH-001 @ 134700km
        </button>
      )}
    </KioskShell>
  );
}
