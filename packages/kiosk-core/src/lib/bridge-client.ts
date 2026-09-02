import type {
  Vehicle,
  Guard,
  Driver,
  GateOutPayload,
  GateInPayload,
  CreateFuelEntryPayload,
  FuelEntry,
  Trip,
  CreateAlertPayload,
} from "../types";

const BRIDGE_TAG = "fleetora-bridge";
const MAIN_APP_ORIGIN = import.meta.env.VITE_MAIN_APP_ORIGIN as string;

interface BridgeMessage {
  source: typeof BRIDGE_TAG;
  id: string;
  result?: unknown;
  error?: string;
}

interface Waiter {
  resolve: (value: unknown) => void;
  reject: (error: Error) => void;
}

let iframe: HTMLIFrameElement | null = null;
let readyPromise: Promise<void> | null = null;
const pending = new Map<string, Waiter>();

function isBridgeMessage(data: unknown): data is BridgeMessage {
  const candidate = data as Partial<BridgeMessage> | null;
  return !!candidate && candidate.source === BRIDGE_TAG && typeof candidate.id === "string";
}

function ensureIframe(): HTMLIFrameElement {
  if (iframe) return iframe;
  if (!MAIN_APP_ORIGIN) {
    throw new Error("VITE_MAIN_APP_ORIGIN is not configured — cannot reach the main app's data bridge.");
  }

  const frame = document.createElement("iframe");
  frame.src = `${MAIN_APP_ORIGIN}/bridge`;
  frame.hidden = true;
  frame.setAttribute("aria-hidden", "true");
  document.body.appendChild(frame);
  iframe = frame;

  window.addEventListener("message", (event) => {
    if (event.origin !== MAIN_APP_ORIGIN || !isBridgeMessage(event.data)) return;
    const waiter = pending.get(event.data.id);
    if (!waiter) return;
    pending.delete(event.data.id);
    if (event.data.error) waiter.reject(new Error(event.data.error));
    else waiter.resolve(event.data.result);
  });

  return frame;
}

function rawCall<T>(fn: string, args: unknown[], timeoutMs = 10_000): Promise<T> {
  return new Promise((resolve, reject) => {
    const frame = ensureIframe();
    const id = crypto.randomUUID();
    const timeout = setTimeout(() => {
      pending.delete(id);
      reject(new Error(`Bridge request "${fn}" timed out. Check your connection and try again.`));
    }, timeoutMs);

    pending.set(id, {
      resolve: (value) => {
        clearTimeout(timeout);
        resolve(value as T);
      },
      reject: (error) => {
        clearTimeout(timeout);
        reject(error);
      },
    });

    frame.contentWindow?.postMessage({ source: BRIDGE_TAG, id, fn, args }, MAIN_APP_ORIGIN);
  });
}

/**
 * The iframe's `load` event fires once its HTML/scripts have loaded, but that's not proof
 * the React app inside has mounted and registered its message listener yet (Vite serves the
 * module graph as separate ES module requests, which can resolve after `load`). So instead of
 * sending a single ping on `load`, poll with short-lived pings until one gets a reply.
 */
function waitUntilReady(): Promise<void> {
  if (readyPromise) return readyPromise;
  ensureIframe();

  readyPromise = new Promise((resolve, reject) => {
    const deadline = Date.now() + 8_000;

    function attempt() {
      rawCall("ping", [], 400)
        .then(() => resolve())
        .catch(() => {
          if (Date.now() >= deadline) {
            reject(new Error("Could not reach the main app. Make sure it is running and try again."));
            return;
          }
          setTimeout(attempt, 300);
        });
    }

    attempt();
  });

  return readyPromise;
}

async function callBridge<T>(fn: string, args: unknown[]): Promise<T> {
  await waitUntilReady();
  return rawCall<T>(fn, args);
}

export function getVehicleByCode(code: string): Promise<Vehicle | undefined> {
  return callBridge("getVehicleByCode", [code]);
}

export function getGuardByCode(code: string): Promise<Guard | undefined> {
  return callBridge("getGuardByCode", [code]);
}

export function getDriverByCode(code: string): Promise<Driver | undefined> {
  return callBridge("getDriverByCode", [code]);
}

export function createGateOut(payload: GateOutPayload): Promise<Trip> {
  return callBridge("createGateOut", [payload]);
}

export function completeGateIn(payload: GateInPayload): Promise<Trip> {
  return callBridge("completeGateIn", [payload]);
}

export function createFuelEntry(payload: CreateFuelEntryPayload): Promise<FuelEntry> {
  return callBridge("createFuelEntry", [payload]);
}

export function createAlert(payload: CreateAlertPayload): Promise<void> {
  return callBridge("createAlert", [payload]);
}
