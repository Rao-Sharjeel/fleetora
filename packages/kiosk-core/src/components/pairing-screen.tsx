import { useEffect, useState } from "react";
import { KeyRound, QrCode } from "lucide-react";
import { getKioskConfig } from "../config";
import { useDeviceSession, requestPersistentStorage } from "../state/device-session";
import { claimKioskDevice } from "../lib/kiosk-api";
import { describeDevice } from "../lib/device-info";
import { decodeQr } from "../lib/barcode";
import { ApiError } from "../lib/api-client";
import { PrimaryButton } from "./kiosk-shell";
import { CameraView } from "./camera-view";
import { InstallBanner } from "./install-banner";

/**
 * Shown once per device, on first launch. A key is issued from the admin
 * app's Kiosk Devices screen, scoped to one app (Exit/Entry/Fuel), and shown
 * there as a QR code — scanning it here claims the key for this install.
 *
 * A key can be claimed exactly once. The server binds it to this install's
 * `installationId` (see state/device-session.ts) the moment this succeeds,
 * and refuses it from anywhere else from then on — including this same
 * key pasted into a different app on the same tablet, since each app is a
 * separate origin with its own storage and its own id.
 */
export function PairingScreen() {
  const pair = useDeviceSession((s) => s.pair);
  const installationId = useDeviceSession((s) => s.installationId);
  const [mode, setMode] = useState<"scan" | "manual">("scan");
  const [manualKey, setManualKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Best-effort: losing this install's storage means losing the only thing
    // that identifies it, and the key can never be re-claimed — only reissued.
    requestPersistentStorage();
  }, []);

  async function attemptClaim(apiKey: string) {
    const trimmed = apiKey.trim();
    if (!trimmed || busy) return;
    setBusy(true);
    setError(null);
    try {
      await claimKioskDevice({
        apiKey: trimmed,
        installationId,
        app: getKioskConfig().app,
        deviceLabel: describeDevice(),
      });
      // The claim response confirms this install now owns the key; nothing
      // further to verify before storing it.
      pair(trimmed);
    } catch (err) {
      // The claim endpoint always replies with a specific reason (wrong app,
      // already claimed by another device, key not found) — surface it as-is
      // rather than a generic failure.
      setError(
        err instanceof ApiError
          ? err.message
          : "Couldn't reach the server to pair this device. Check your connection and try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function handleCapture(canvas: HTMLCanvasElement) {
    const code = await decodeQr(canvas);
    if (!code) {
      setError("No QR code detected. Try again, or enter the key manually.");
      return;
    }
    await attemptClaim(code);
  }

  return (
    <div className="flex min-h-dvh w-full flex-col items-center justify-center gap-6 bg-kiosk-bg px-6 text-center text-kiosk-text">
      <div className="flex flex-col items-center gap-1">
        <img src="/drive-logo.png" alt="D-RIVE" className="h-8 w-auto object-contain" />
        <span className="text-lg font-extrabold tracking-tight text-kiosk-accent">{getKioskConfig().wordmark}</span>
      </div>

      {mode === "scan" ? (
        <>
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold">Pair this device</h1>
            <p className="max-w-xs text-sm text-kiosk-muted">
              Scan the QR code for this device from the Kiosk Devices screen in the Fleetora admin app.
            </p>
          </div>
          {error && <p className="max-w-xs text-sm text-kiosk-danger">{error}</p>}
          {busy ? (
            <div className="flex h-64 w-full max-w-xs items-center justify-center text-sm text-kiosk-muted">
              Pairing…
            </div>
          ) : (
            <div className="flex h-64 w-full max-w-xs flex-col">
              <CameraView
                variant="frame"
                hint="Position the QR code inside the frame"
                onCapture={handleCapture}
                onDetectQr={attemptClaim}
              />
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              setMode("manual");
              setError(null);
            }}
            className="flex items-center gap-1.5 text-xs text-kiosk-muted underline"
          >
            <KeyRound className="h-3.5 w-3.5" /> Enter the key manually instead
          </button>
        </>
      ) : (
        <>
          <KeyRound className="h-8 w-8 text-kiosk-muted" />
          <div className="flex flex-col gap-1">
            <h1 className="text-base font-semibold">Enter the device key</h1>
            <p className="max-w-xs text-sm text-kiosk-muted">
              From the Kiosk Devices screen in the Fleetora admin app.
            </p>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              attemptClaim(manualKey);
            }}
            className="flex w-full max-w-xs flex-col gap-3"
          >
            <input
              value={manualKey}
              onChange={(e) => setManualKey(e.target.value)}
              placeholder="Device key"
              autoCapitalize="off"
              autoCorrect="off"
              spellCheck={false}
              className="h-12 w-full rounded-xl border border-kiosk-border bg-kiosk-panel px-4 text-center text-sm text-kiosk-text outline-none focus:border-kiosk-accent"
            />
            {error && <p className="text-sm text-kiosk-danger">{error}</p>}
            <PrimaryButton type="submit" disabled={busy || !manualKey.trim()}>
              {busy ? "Pairing…" : "Pair Device"}
            </PrimaryButton>
          </form>
          <button
            type="button"
            onClick={() => {
              setMode("scan");
              setError(null);
            }}
            className="flex items-center gap-1.5 text-xs text-kiosk-muted underline"
          >
            <QrCode className="h-3.5 w-3.5" /> Scan a QR code instead
          </button>
        </>
      )}

      <InstallBanner />
    </div>
  );
}
