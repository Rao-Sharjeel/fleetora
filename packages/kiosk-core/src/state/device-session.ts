import { create } from "zustand";
import { persist } from "zustand/middleware";

interface DeviceSessionState {
  apiKey: string | null;
  /** Generated once on this install and sent with every request. The server
   * binds a key to the first installation id that claims it and refuses any
   * other — this is what makes a key usable on exactly one device instead of
   * being a bearer secret anyone who reads it off a screen can reuse. */
  installationId: string;
  pair: (apiKey: string) => void;
  unpair: () => void;
}

function newInstallationId(): string {
  return typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

/** Persisted across reloads — a kiosk pairs once, on first launch, and stays
 * paired until an admin revokes the device or someone unpairs it deliberately.
 * Unlike the per-transaction exit/entry/fuel session stores, this is meant to
 * survive indefinitely.
 *
 * `installationId` is generated the moment this store first initialises —
 * before pairing, not after — so a claim request that succeeds on the server
 * but is lost on the way back (dropped connection, tab closed) can retry with
 * the *same* id and land on the claim endpoint's same-install no-op path,
 * rather than mint a second id that the server would then see as a different,
 * conflicting device.
 */
export const useDeviceSession = create<DeviceSessionState>()(
  persist(
    (set) => ({
      apiKey: null,
      installationId: newInstallationId(),
      pair: (apiKey) => set({ apiKey }),
      unpair: () => set({ apiKey: null }),
    }),
    { name: "kiosk-device" },
  ),
);

/**
 * Asks the browser not to evict this device's storage under pressure.
 *
 * Losing `installationId` is unrecoverable by design — the claim it identifies
 * can never be reassigned — so the device would need a freshly issued key.
 * Chrome/Android usually grants this once the site has been used a little;
 * calling it costs nothing when it's refused. iOS Safari doesn't support the
 * API at all and evicts unused PWA storage after about a week regardless, so
 * this is a mitigation, not a guarantee, on that platform.
 */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    // Best-effort — a refusal or an unsupported browser just means eviction
    // remains possible, not that anything here is broken.
  }
}
