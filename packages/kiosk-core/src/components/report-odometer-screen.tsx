import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { KioskShell, PrimaryButton } from "./kiosk-shell";
import { CameraView } from "./camera-view";

interface ReportOdometerScreenProps {
  /** How many reads were attempted before giving up — recorded with the issue
   * so a cluster that always fails, or a bad camera, is visible later. */
  attempts: number;
  /** Called with the captured photo as a data URL once the guard confirms it. */
  onSubmit: (photoDataUrl: string) => void;
  onBack: () => void;
}

/**
 * Hands an unreadable odometer to an admin instead of to the guard.
 *
 * Guards deliberately cannot type a reading in — a typed number is exactly the
 * thing scanning is meant to remove. So when the reader keeps failing, the
 * guard photographs the cluster, the gate flow continues, and the reading is
 * filled in from the desk against the photo.
 */
export function ReportOdometerScreen({ attempts, onSubmit, onBack }: ReportOdometerScreenProps) {
  const [photo, setPhoto] = useState<string | null>(null);

  if (photo) {
    return (
      <KioskShell
        onBack={() => setPhoto(null)}
        footer={
          <>
            <PrimaryButton onClick={() => onSubmit(photo)}>Send for review</PrimaryButton>
            <button type="button" className="text-sm text-kiosk-blue" onClick={() => setPhoto(null)}>
              Retake photo
            </button>
          </>
        }
      >
        <h1 className="text-lg font-semibold">Check the photo</h1>
        <p className="text-sm text-kiosk-muted">
          The digits must be readable by someone who isn't standing at the vehicle.
        </p>
        <img src={photo} alt="Odometer" className="max-h-72 w-full rounded-2xl border border-kiosk-border object-contain" />
      </KioskShell>
    );
  }

  return (
    <KioskShell onBack={onBack}>
      <div className="flex items-start gap-2 rounded-2xl border border-kiosk-warning/40 bg-kiosk-warning/10 p-3">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-kiosk-warning" />
        <p className="text-sm text-kiosk-warning">
          {attempts} attempts couldn't read this odometer. Take one clear photo and an administrator
          will enter the reading — the vehicle isn't held up.
        </p>
      </div>
      <h1 className="text-lg font-semibold">Photograph the odometer</h1>
      <p className="text-sm text-kiosk-muted">
        Get as close as the digits allow. This photo is the only record of the reading.
      </p>
      <CameraView variant="odometer" hint="Fill the frame with the odometer" onCapture={(_c, dataUrl) => setPhoto(dataUrl)} />
    </KioskShell>
  );
}
