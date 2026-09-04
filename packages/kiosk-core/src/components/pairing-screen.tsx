import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { getKioskConfig } from "../config";
import { useDeviceSession } from "../state/device-session";
import { getVehicleByCode } from "../lib/kiosk-api";
import { ApiError } from "../lib/api-client";
import { PrimaryButton } from "./kiosk-shell";

/** Shown once per device, on first launch. A device key is issued from the admin
 * app's Kiosk Devices screen and typed in here — after that it's persisted
 * (see state/device-session.ts) until an admin revokes it or someone unpairs it. */
export function PairingScreen() {
  const pair = useDeviceSession((s) => s.pair);
  const unpair = useDeviceSession((s) => s.unpair);
  const [apiKey, setApiKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const trimmed = apiKey.trim();
    if (!trimmed) return;
    setBusy(true);
    setError(null);
    // Pair first so the probe call below actually sends this key. getVehicleByCode
    // already treats a 404 "not found" as a normal (non-throwing) result, so
    // reaching here without an exception means the key was accepted.
    pair(trimmed);
    try {
      await getVehicleByCode("__pairing_check__");
    } catch (err) {
      unpair();
      setError(
        err instanceof ApiError && err.status === 401
          ? "That device key wasn't accepted. Double-check it and try again."
          : "Couldn't reach the server to verify this device. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-6 bg-kiosk-bg px-6 text-center text-kiosk-text">
      <div className="flex flex-col items-center gap-1">
        {/* <img src="/fleetora-wordmark.png" alt="Fleetora" className="h-8 w-auto object-contain" /> */}
        <img src="/drive-logo.png" alt="D-RIVE" className="h-8 w-auto object-contain" />
        <span className="text-lg font-extrabold tracking-tight text-kiosk-accent">{getKioskConfig().wordmark}</span>
      </div>
      <KeyRound className="h-8 w-8 text-kiosk-muted" />
      <div className="flex flex-col gap-1">
        <h1 className="text-base font-semibold">Pair this device</h1>
        <p className="max-w-xs text-sm text-kiosk-muted">
          Enter the device key from the Kiosk Devices screen in the Fleetora admin app.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="flex w-full max-w-xs flex-col gap-3">
        <input
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder="Device key"
          autoCapitalize="off"
          autoCorrect="off"
          spellCheck={false}
          className="h-12 w-full rounded-xl border border-kiosk-border bg-kiosk-panel px-4 text-center text-sm text-kiosk-text outline-none focus:border-kiosk-accent"
        />
        {error && <p className="text-sm text-kiosk-danger">{error}</p>}
        <PrimaryButton type="submit" disabled={busy || !apiKey.trim()}>
          {busy ? "Checking…" : "Pair Device"}
        </PrimaryButton>
      </form>
    </div>
  );
}
