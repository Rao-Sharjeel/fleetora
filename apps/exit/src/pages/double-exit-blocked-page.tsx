import { KioskShell, SecondaryButton } from "@fleetora/kiosk-core";
import { BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function DoubleExitBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const reset = useExitSession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="Exit Blocked" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> is already marked as{" "}
          <span className="text-kiosk-text">Outside</span> — it may have exited without a matching Entry scan.
        </p>
        <p className="mt-2">The admin has been notified. This exit cannot be processed here.</p>
      </div>
    </KioskShell>
  );
}
