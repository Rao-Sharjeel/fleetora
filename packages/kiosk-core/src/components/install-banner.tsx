import { Download, Share } from "lucide-react";
import { useInstallPrompt } from "../hooks/use-install-prompt";

/**
 * One-time nudge on the pairing screen so the device gets added to the home
 * screen during setup rather than left running in a browser tab. Chrome stopped
 * showing its own install prompt automatically years ago (no site engagement
 * signal to trigger it on a kiosk that's opened once and pinned) — this listens
 * for `beforeinstallprompt` and surfaces a real "Add to Home Screen" button.
 * iOS Safari has no install API at all, so it gets manual instructions instead.
 */
export function InstallBanner() {
  const { installed, canPromptInstall, isIos, promptInstall } = useInstallPrompt();

  if (installed || (!canPromptInstall && !isIos)) return null;

  return (
    <div className="flex w-full max-w-xs flex-col items-center gap-2 rounded-xl border border-kiosk-border bg-kiosk-panel p-3 text-center">
      {canPromptInstall ? (
        <>
          <p className="text-xs text-kiosk-muted">Add this to the home screen so it launches full-screen.</p>
          <button
            type="button"
            onClick={promptInstall}
            className="flex items-center gap-2 rounded-lg bg-kiosk-accent px-4 py-2 text-sm font-semibold text-white active:scale-95"
          >
            <Download className="h-4 w-4" />
            Add to Home Screen
          </button>
        </>
      ) : (
        <p className="flex items-center justify-center gap-1.5 text-xs text-kiosk-muted">
          Tap <Share className="h-3.5 w-3.5 shrink-0" /> then "Add to Home Screen" so this launches full-screen.
        </p>
      )}
    </div>
  );
}
