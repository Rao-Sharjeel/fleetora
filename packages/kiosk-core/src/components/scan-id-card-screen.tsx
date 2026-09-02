import { useState } from "react";
import { KioskShell, SecondaryButton } from "./kiosk-shell";
import { CameraView } from "./camera-view";
import { decodeQr } from "../lib/barcode";

interface ScanIdCardScreenProps<T> {
  title: string;
  subtitle: string;
  /** Look the scanned Fleetora ID up against the API. Return undefined if it doesn't resolve. */
  resolve: (code: string) => Promise<T | undefined>;
  /** Optional extra gate, e.g. "this guard isn't authorized for exits". Return an error string to reject. */
  validate?: (record: T) => string | null;
  onResolved: (record: T) => void;
  onCancel: () => void;
  onBack?: () => void;
  notFoundMessage: string;
  /** Dev-only shortcut code, so the flow is testable without a physical card. */
  devSkipCode?: string;
}

/**
 * The "scan a Fleetora ID card" step — identical in Exit, Entry and Fuel, so it
 * lives here rather than being copy-pasted three times. Parameterised by how the
 * scanned code resolves (guard vs driver) rather than reading any app's store.
 */
export function ScanIdCardScreen<T>({
  title,
  subtitle,
  resolve,
  validate,
  onResolved,
  onCancel,
  onBack,
  notFoundMessage,
  devSkipCode,
}: ScanIdCardScreenProps<T>) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function resolveCode(code: string) {
    setBusy(true);
    setMessage(null);
    try {
      const record = await resolve(code);
      if (!record) {
        setMessage(notFoundMessage);
        return;
      }
      const problem = validate?.(record);
      if (problem) {
        setMessage(problem);
        return;
      }
      onResolved(record);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleCapture(canvas: HTMLCanvasElement) {
    setBusy(true);
    setMessage(null);
    const code = await decodeQr(canvas);
    if (!code) {
      setMessage("No QR code detected. Please try again.");
      setBusy(false);
      return;
    }
    await resolveCode(code);
  }

  return (
    <KioskShell onBack={onBack} footer={<SecondaryButton onClick={onCancel}>Cancel</SecondaryButton>}>
      <h1 className="text-lg font-semibold">{title}</h1>
      <p className="text-sm text-kiosk-muted">{subtitle}</p>
      {message && <p className="rounded-lg bg-kiosk-danger/10 p-2 text-center text-sm text-kiosk-danger">{message}</p>}
      {busy ? (
        <div className="flex flex-1 items-center justify-center text-sm text-kiosk-muted">Checking ID…</div>
      ) : (
        <CameraView variant="frame" hint="Position the QR code inside the frame to scan" onCapture={handleCapture} />
      )}
      {import.meta.env.DEV && devSkipCode && (
        <button type="button" onClick={() => resolveCode(devSkipCode)} className="text-xs text-kiosk-muted underline">
          Skip (dev): use {devSkipCode}
        </button>
      )}
    </KioskShell>
  );
}
