import { KioskShell, SecondaryButton, BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function PlanExpiredBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const reset = useExitSession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="Trip Plan Expired" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> had a trip planned for an earlier
          day — a plan is only valid on the day it was made for.
        </p>
        <p className="mt-2">Ask the Transport Incharge to plan a new trip for today.</p>
      </div>
    </KioskShell>
  );
}
