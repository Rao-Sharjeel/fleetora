import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { SuccessBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function FrontPhotoSavedPage() {
  const frontPhoto = useExitSession((s) => s.frontPhoto);
  const plateGuess = useExitSession((s) => s.plateGuess);
  const setPlateGuess = useExitSession((s) => s.setPlateGuess);
  const setStep = useExitSession((s) => s.setStep);

  if (!frontPhoto) return null;

  return (
    <KioskShell
      footer={
        <>
          <PrimaryButton onClick={() => setStep("SCAN_VEHICLE")}>Continue</PrimaryButton>
          <button type="button" className="text-sm text-kiosk-blue" onClick={() => setStep("CAPTURE_FRONT")}>
            Retake
          </button>
        </>
      }
    >
      <SuccessBadge label="Front Photo Captured" />
      <img src={frontPhoto} alt="Vehicle front" className="aspect-video w-full rounded-2xl object-cover" />
      <div className="flex flex-col gap-1.5">
        <label className="text-sm text-kiosk-muted">Plate Detected (OCR)</label>
        <input
          value={plateGuess}
          onChange={(e) => setPlateGuess(e.target.value)}
          className="h-11 rounded-xl border border-kiosk-border bg-kiosk-panel px-3 text-base text-kiosk-text outline-none focus:border-kiosk-blue"
          placeholder="e.g. LEA-1234"
        />
      </div>
    </KioskShell>
  );
}
