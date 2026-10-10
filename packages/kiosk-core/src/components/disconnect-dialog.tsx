import { useState } from "react";
import { Loader2, LogOut } from "lucide-react";
import { releaseKioskDevice } from "../lib/kiosk-api";
import { useDeviceSession } from "../state/device-session";
import { ApiError } from "../lib/api-client";

/**
 * Unpairing this phone from the fleet, behind the administrator's password.
 *
 * Needed because phones move: a device is reassigned, a guard leaves, a
 * handset is replaced. Without this the only way to free a key is an
 * administrator at a console, and in the meantime the phone keeps working as
 * whatever device it was issued as.
 *
 * The password is checked on the server, never here. A check in the browser
 * would be worth nothing — the key sits in this device's own storage, and
 * anyone able to read it could skip the dialog entirely.
 */
export function DisconnectDialog({ onClose }: { onClose: () => void }) {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const unpair = useDeviceSession((s) => s.unpair);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (busy || !password) return;
    setBusy(true);
    setError(null);
    try {
      await releaseKioskDevice(password);
      // Only after the server has actually released it: clearing local state
      // on a failed call would strand the phone, still bound server-side but
      // with no key to prove it.
      unpair();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Couldn't disconnect. Check the connection and try again.");
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-4 sm:items-center">
      <form
        onSubmit={submit}
        className="flex w-full max-w-sm flex-col gap-4 rounded-2xl border border-kiosk-border bg-kiosk-panel p-5"
      >
        <div className="flex flex-col gap-1">
          <span className="text-base font-semibold text-kiosk-text">Disconnect this device?</span>
          <span className="text-xs text-kiosk-muted">
            It will stop recording for this fleet and return to the pairing screen. An administrator's password is
            required.
          </span>
        </div>

        <input
          type="password"
          inputMode="text"
          autoComplete="off"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Administrator password"
          className="h-12 rounded-xl border border-kiosk-border bg-kiosk-bg px-3 text-base text-kiosk-text"
        />

        {error && <span className="text-xs text-kiosk-danger">{error}</span>}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="h-12 flex-1 rounded-xl border border-kiosk-border text-sm font-medium text-kiosk-muted active:scale-95"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy || !password}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-kiosk-danger text-sm font-semibold text-white active:scale-95 disabled:opacity-50"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Disconnect
          </button>
        </div>
      </form>
    </div>
  );
}
