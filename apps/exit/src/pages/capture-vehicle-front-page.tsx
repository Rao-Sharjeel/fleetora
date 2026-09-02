import { useState } from "react";
import { KioskShell } from "@fleetora/kiosk-core";
import { CameraView } from "@fleetora/kiosk-core";
import { recognizePlateText } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function CaptureVehicleFrontPage() {
  const setFrontCapture = useExitSession((s) => s.setFrontCapture);
  const setStep = useExitSession((s) => s.setStep);
  const [busy, setBusy] = useState(false);

  async function handleCapture(canvas: HTMLCanvasElement, dataUrl: string) {
    setBusy(true);
    try {
      const plateGuess = await recognizePlateText(canvas);
      setFrontCapture(dataUrl, plateGuess);
    } finally {
      setBusy(false);
    }
  }

  return (
    <KioskShell onBack={() => setStep("DRIVER_IDENTIFIED")}>
      <h1 className="text-lg font-semibold">Capture Vehicle Front</h1>
      <p className="text-sm text-kiosk-muted">Take a clear photo of the vehicle from the front.</p>
      {busy ? (
        <div className="flex flex-1 items-center justify-center text-sm text-kiosk-muted">Reading plate…</div>
      ) : (
        <CameraView variant="photo" onCapture={handleCapture} />
      )}
    </KioskShell>
  );
}
