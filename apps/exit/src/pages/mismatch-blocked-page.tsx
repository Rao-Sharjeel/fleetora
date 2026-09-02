import { KioskShell, PrimaryButton } from "@fleetora/kiosk-core";
import { BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function MismatchBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const plateGuess = useExitSession((s) => s.plateGuess);
  const setStep = useExitSession((s) => s.setStep);

  return (
    <KioskShell footer={<PrimaryButton onClick={() => setStep("CAPTURE_ODOMETER_QR")}>Retake Photo</PrimaryButton>}>
      <BlockedBadge label="Vehicle Mismatch" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          The vehicle plate captured earlier (<span className="text-kiosk-text">{plateGuess || "—"}</span>) doesn't
          match the QR code on this vehicle (
          <span className="text-kiosk-text">{vehicle?.registrationNumber ?? "—"}</span>).
        </p>
        <p className="mt-2">Please make sure both photos are of the same vehicle and try again.</p>
      </div>
    </KioskShell>
  );
}
