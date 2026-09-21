import { KioskShell, SecondaryButton, BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function NoPlanBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const reset = useExitSession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="No Trip Authorized" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> has no trip planned for today.
        </p>
        <p className="mt-2">Ask the Transport Incharge to plan a trip for this vehicle before it can leave.</p>
      </div>
    </KioskShell>
  );
}
