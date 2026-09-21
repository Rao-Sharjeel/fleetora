import { KioskShell, SecondaryButton, BlockedBadge } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function DriverMismatchBlockedPage() {
  const vehicle = useExitSession((s) => s.vehicle);
  const plan = useExitSession((s) => s.plan);
  const mismatchDriver = useExitSession((s) => s.mismatchDriver);
  const reset = useExitSession((s) => s.reset);

  return (
    <KioskShell footer={<SecondaryButton onClick={reset}>Start Over</SecondaryButton>}>
      <BlockedBadge label="Different Driver" />
      <div className="rounded-2xl border border-kiosk-border bg-kiosk-panel p-4 text-sm text-kiosk-muted">
        <p>
          The trip for <span className="text-kiosk-text">{vehicle?.registrationNumber}</span> is assigned to{" "}
          <span className="text-kiosk-text">{plan?.driverName}</span>, not{" "}
          <span className="text-kiosk-text">{mismatchDriver?.name}</span>.
        </p>
        <p className="mt-2">
          If the driver has genuinely changed, ask the Transport Incharge to update the plan, then scan again.
        </p>
      </div>
    </KioskShell>
  );
}
