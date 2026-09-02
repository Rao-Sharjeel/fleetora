import { PrimaryButton } from "./kiosk-shell";

interface SplashScreenProps {
  /** The word after FLEETORA — "EXIT", "ENTRY", "FUEL". */
  wordmark: string;
  onBegin: () => void;
}

/** Shared launch screen. Each kiosk supplies its own wordmark; the accent
 * colour comes from that app's own --color-kiosk-accent token. */
export function SplashScreen({ wordmark, onBegin }: SplashScreenProps) {
  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-between bg-kiosk-bg px-6 py-12 text-center"
      style={{
        backgroundImage:
          "radial-gradient(120% 55% at 50% -8%, color-mix(in srgb, var(--color-kiosk-accent) 32%, transparent), transparent 65%)",
      }}
    >
      <div />
      <div className="flex flex-col items-center gap-3">
        <img src="/fleetora-logo.png" alt="Fleetora" className="h-auto w-[78%] max-w-[320px] object-contain" />
        <span className="text-4xl font-extrabold tracking-tight text-kiosk-accent">{wordmark}</span>
      </div>
      <div className="flex w-full flex-col items-center gap-3">
        <PrimaryButton onClick={onBegin}>Tap to Begin</PrimaryButton>
        <div className="flex items-center gap-2 text-xs text-kiosk-muted">
          <span>Powered by SigmaSoft AI</span>
          <img src="/sigma-soft-logo.png" alt="" className="h-8 w-8 object-contain" />
        </div>
      </div>
    </div>
  );
}
