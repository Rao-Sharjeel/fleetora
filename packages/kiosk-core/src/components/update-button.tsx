import { useState } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { checkForUpdate, hardReset } from "../lib/app-update";

type Status = "idle" | "checking" | "current" | "updating";

/**
 * "Check for update" on the screen an operator is already looking at.
 *
 * A tap does the cheap thing: ask the service worker to fetch a new build and,
 * if there is one, let it take over immediately instead of waiting for every
 * page to close — which on a phone that is never closed is never. Holding the
 * button does the expensive thing: clear every cache and registration, at the
 * cost of re-downloading the model and runtime.
 */
export function UpdateButton() {
  const [status, setStatus] = useState<Status>("idle");
  let holdTimer: number | undefined;

  async function tap() {
    if (status === "checking" || status === "updating") return;
    setStatus("checking");
    try {
      const found = await checkForUpdate();
      if (found) {
        setStatus("updating");
        window.location.reload();
      } else {
        setStatus("current");
        window.setTimeout(() => setStatus("idle"), 2500);
      }
    } catch {
      // Offline, or no worker registered. Reloading is still the most useful
      // thing a person pressing this can get.
      window.location.reload();
    }
  }

  async function hold() {
    if (!window.confirm("Reset this app and download it again? This can take a few minutes on a slow connection.")) {
      return;
    }
    setStatus("updating");
    await hardReset();
    window.location.reload();
  }

  const label =
    status === "checking" ? "Checking…" : status === "updating" ? "Updating…" : status === "current" ? "Up to date" : "Check for update";

  return (
    <button
      type="button"
      onClick={tap}
      onPointerDown={() => {
        holdTimer = window.setTimeout(hold, 900);
      }}
      onPointerUp={() => window.clearTimeout(holdTimer)}
      onPointerLeave={() => window.clearTimeout(holdTimer)}
      onContextMenu={(e) => e.preventDefault()}
      className="flex items-center gap-1.5 rounded-full border border-kiosk-border/60 px-3 py-1 text-[11px] text-kiosk-muted active:scale-95"
    >
      {status === "checking" || status === "updating" ? (
        <Loader2 className="h-3 w-3 animate-spin" />
      ) : (
        <RefreshCw className="h-3 w-3" />
      )}
      {label}
    </button>
  );
}
