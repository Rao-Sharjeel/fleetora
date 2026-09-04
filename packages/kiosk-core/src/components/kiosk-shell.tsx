import type { ButtonHTMLAttributes, ReactNode } from "react";
import { ChevronLeft } from "lucide-react";
import { getKioskConfig } from "../config";

interface KioskShellProps {
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
}

/** Consistent full-screen card frame matching every step of the Exit flow reference design. */
export function KioskShell({ onBack, children, footer }: KioskShellProps) {
  return (
    <div className="flex h-dvh w-full flex-col overflow-hidden bg-kiosk-bg text-kiosk-text">
      <header className="flex shrink-0 items-center gap-3 border-b border-kiosk-border px-4 py-4">
        {onBack ? (
          <button type="button" onClick={onBack} aria-label="Back" className="text-kiosk-muted active:scale-95">
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <span className="w-5" />
        )}
        <div className="flex items-center gap-1.5">
          {/* <img src="/fleetora-wordmark.png" alt="Fleetora" className="h-4 w-auto object-contain" /> */}
          <img src="/drive-logo.png" alt="D-RIVE" className="h-4 w-auto object-contain" />
          <span className="text-sm font-extrabold tracking-wide text-kiosk-accent">{getKioskConfig().wordmark}</span>
        </div>
      </header>
      <main className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto p-4">{children}</main>
      {footer && <footer className="flex shrink-0 flex-col gap-2 border-t border-kiosk-border p-4">{footer}</footer>}
    </div>
  );
}

export function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`h-12 w-full rounded-xl bg-kiosk-accent text-base font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-40 active:scale-[0.98] ${className}`}
    />
  );
}

export function SecondaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  const { className = "", ...rest } = props;
  return (
    <button
      {...rest}
      className={`h-11 w-full rounded-xl border border-kiosk-border bg-transparent text-sm font-medium text-kiosk-muted transition active:scale-[0.98] ${className}`}
    />
  );
}
