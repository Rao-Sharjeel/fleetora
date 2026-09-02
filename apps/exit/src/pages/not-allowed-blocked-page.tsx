import { KioskShell, SecondaryButton } from "@fleetora/kiosk-core";
import { BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function NotAllowedBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const reset = useExitSession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="Exit Not Allowed" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> is currently flagged as not allowed
          to exit.
        </p>
        {vehicle?.allowedToExitReason && (
          <p className="mt-2">
            Reason: <span className="text-kiosk-text">{vehicle.allowedToExitReason}</span>
          </p>
        )}
        <p className="mt-2">Please contact the Transport Incharge.</p>
      </div>
    </KioskShell>
  );
}
