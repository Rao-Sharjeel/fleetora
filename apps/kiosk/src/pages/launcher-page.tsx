import { LogOut, LogIn, Fuel } from "lucide-react";
import { BuildStamp, UpdateButton, configureKiosk, useDeviceSession, type KioskApp } from "@fleetora/kiosk-core";
import { useKioskMode } from "@/state/kiosk-mode";
import { useExitSession } from "@/flows/exit/exit-session";
import { useEntrySession } from "@/flows/entry/entry-session";
import { useFuelSession } from "@/flows/fuel/fuel-session";

interface Flow {
  app: KioskApp;
  label: string;
  wordmark: string;
  hint: string;
  icon: typeof LogOut;
  /** Clears whatever was left of a previous transaction and opens this flow on
   * its first real step — the launcher has already replaced the per-flow splash
   * that used to sit here, so there is nothing to tap through. */
  start: () => void;
}

const FLOWS: Flow[] = [
  {
    app: "exit",
    label: "Exit",
    wordmark: "EXIT",
    hint: "Vehicle leaving on a planned trip",
    icon: LogOut,
    start: () => {
      useExitSession.getState().reset();
      useExitSession.getState().setStep("SCAN_GUARD");
    },
  },
  {
    app: "entry",
    label: "Entry",
    wordmark: "ENTRY",
    hint: "Vehicle returning to the yard",
    icon: LogIn,
    start: () => {
      useEntrySession.getState().reset();
      useEntrySession.getState().setStep("SCAN_GUARD");
    },
  },
  {
    app: "fuel",
    label: "Fuel",
    wordmark: "FUEL",
    hint: "Recording a refuel at the pump",
    icon: Fuel,
    start: () => {
      useFuelSession.getState().reset();
      useFuelSession.getState().setStep("SCAN_GUARD");
    },
  },
];

/**
 * The home screen, and the screen between transactions — each flow's SPLASH
 * step renders this, so finishing an exit drops the guard back here rather than
 * on an Exit-only "tap to begin". The next vehicle is as likely to be an entry.
 *
 * Only the functions this device's key allows are offered (KioskDevice.apps,
 * returned when the key was claimed). A phone issued an Exit-only key shows one
 * button, and the server would refuse the others anyway.
 */
export function LauncherPage() {
  const allowed = useDeviceSession((s) => s.apps);
  const setMode = useKioskMode((s) => s.setMode);
  const available = FLOWS.filter((f) => allowed.includes(f.app));

  function choose(flow: Flow) {
    // Set the header wordmark before the state change that re-renders into the
    // flow, so the first frame of it is already branded correctly.
    configureKiosk({ wordmark: flow.wordmark });
    flow.start();
    setMode(flow.app);
  }

  return (
    <div
      className="flex min-h-dvh w-full flex-col items-center justify-between bg-kiosk-bg px-6 py-10 text-center"
      style={{
        backgroundImage:
          "radial-gradient(120% 55% at 50% -8%, color-mix(in srgb, var(--color-kiosk-accent) 32%, transparent), transparent 65%)",
      }}
    >
      <img src="/drive-logo.png" alt="D-RIVE" className="h-auto w-[62%] max-w-[260px] object-contain" />

      <div className="flex w-full flex-col gap-4">
        {available.map((flow) => {
          const Icon = flow.icon;
          return (
            <button
              key={flow.app}
              type="button"
              onClick={() => choose(flow)}
              className="flex w-full items-center gap-4 rounded-2xl border border-kiosk-accent/30 bg-kiosk-accent/10 px-5 py-6 text-left transition active:scale-[0.98]"
            >
              <Icon className="h-9 w-9 shrink-0 text-kiosk-accent" />
              <span className="flex min-w-0 flex-col">
                <span className="text-2xl font-extrabold tracking-tight text-kiosk-accent">{flow.label}</span>
                <span className="text-sm text-kiosk-muted">{flow.hint}</span>
              </span>
            </button>
          );
        })}

        {available.length === 0 && (
          <p className="rounded-2xl border border-kiosk-accent/20 px-5 py-8 text-sm text-kiosk-muted">
            This device isn't allowed to perform any gate function yet. Ask an administrator to reissue its key.
          </p>
        )}
      </div>

      <div className="flex flex-col items-center gap-2">
        <div className="flex items-center gap-2 text-xs text-kiosk-muted">
          <span>Powered by SigmaSoft AI</span>
          <img src="/sigma-soft-logo.png" alt="" className="h-8 w-8 object-contain" />
        </div>
        <div className="flex items-center gap-3">
          <BuildStamp />
          <UpdateButton />
        </div>
      </div>
    </div>
  );
}
