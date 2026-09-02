import type { ReactNode } from "react";
import { Smartphone } from "lucide-react";
import { useIsMobileViewport } from "../hooks/use-is-mobile-viewport";
import { getKioskConfig } from "../config";

/** Kiosk apps run on a handheld scanner at the gate — desktop/laptop/tablet
 * browsers get a blocking screen instead of the flow. */
export function MobileOnlyGate({ children }: { children: ReactNode }) {
  const isMobile = useIsMobileViewport();

  if (!isMobile) {
    return (
      <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-4 bg-kiosk-bg px-6 text-center text-kiosk-text">
        <div className="flex flex-col items-center gap-1">
          <img src="/fleetora-wordmark.png" alt="Fleetora" className="h-8 w-auto object-contain" />
          <span className="text-lg font-extrabold tracking-tight text-kiosk-accent">{getKioskConfig().wordmark}</span>
        </div>
        <Smartphone className="h-8 w-8 text-kiosk-muted" />
        <p className="max-w-xs text-sm text-kiosk-muted">
          This screen is designed for mobile devices only. Please open it on a phone to continue.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
