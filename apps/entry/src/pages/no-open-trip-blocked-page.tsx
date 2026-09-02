import { KioskShell, SecondaryButton, BlockedBadge } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function NoOpenTripBlockedPage() {
  const vehicle = useEntrySession((s) => s.vehicle);
  const reset = useEntrySession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="No Open Trip" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> isn't currently marked as
          Outside, so there's no open trip to close.
        </p>
        <p className="mt-2">Its exit may not have been recorded. Please contact the Transport Incharge.</p>
      </div>
    </KioskShell>
  );
}
