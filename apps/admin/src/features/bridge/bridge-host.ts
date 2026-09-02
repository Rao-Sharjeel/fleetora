import { useEffect } from "react";
import { getVehicleByCode } from "@/services/vehicles.service";
import { getGuardByCode } from "@/services/guards.service";
import { getDriverByCode } from "@/services/drivers.service";
import { createGateOut, completeGateIn, type GateOutPayload, type GateInPayload } from "@/services/trips.service";
import { createAlert, type CreateAlertPayload } from "@/services/alerts.service";
import { createFuelEntry, type CreateFuelEntryPayload } from "@/services/fuel.service";

const BRIDGE_TAG = "fleetora-bridge";

type BridgeFn =
  | "ping"
  | "getVehicleByCode"
  | "getGuardByCode"
  | "getDriverByCode"
  | "createGateOut"
  | "completeGateIn"
  | "createFuelEntry"
  | "createAlert";

interface BridgeRequest {
  source: typeof BRIDGE_TAG;
  id: string;
  fn: BridgeFn;
  args: unknown[];
}

interface BridgeResponse {
  source: typeof BRIDGE_TAG;
  id: string;
  result?: unknown;
  error?: string;
}

function allowedOrigins(): string[] {
  const raw = import.meta.env.VITE_ALLOWED_KIOSK_ORIGINS as string | undefined;
  return (raw ?? "")
    .split(",")
    .map((o) => o.trim())
    .filter(Boolean);
}

async function dispatch(fn: BridgeFn, args: unknown[]): Promise<unknown> {
  switch (fn) {
    case "ping":
      return true;
    case "getVehicleByCode":
      return getVehicleByCode(args[0] as string);
    case "getGuardByCode":
      return getGuardByCode(args[0] as string);
    case "getDriverByCode":
      return getDriverByCode(args[0] as string);
    case "createGateOut":
      return createGateOut(args[0] as GateOutPayload);
    case "completeGateIn":
      return completeGateIn(args[0] as GateInPayload);
    case "createFuelEntry":
      return createFuelEntry(args[0] as CreateFuelEntryPayload);
    case "createAlert":
      return createAlert(args[0] as CreateAlertPayload);
    default:
      throw new Error(`Unknown bridge function: ${fn as string}`);
  }
}

function isBridgeRequest(data: unknown): data is BridgeRequest {
  const candidate = data as Partial<BridgeRequest> | null;
  return !!candidate && candidate.source === BRIDGE_TAG && typeof candidate.id === "string" && typeof candidate.fn === "string";
}

/**
 * Mounts a postMessage RPC responder so separately-deployed kiosk apps (different
 * subdomains, e.g. the Exit kiosk) can read/write this app's mock data without a
 * real backend. Temporary bridge — see the Fleetora Exit plan doc for known limits
 * (last-write-wins, requires this page to stay reachable, no offline support).
 */
export function useBridgeHost() {
  useEffect(() => {
    const allowed = allowedOrigins();

    function handleMessage(event: MessageEvent) {
      if (!isBridgeRequest(event.data)) return;
      if (allowed.length > 0 && !allowed.includes(event.origin)) return;

      const request = event.data;
      const source = event.source as Window | null;
      if (!source) return;

      const reply = (payload: Omit<BridgeResponse, "source" | "id">) => {
        const response: BridgeResponse = { source: BRIDGE_TAG, id: request.id, ...payload };
        source.postMessage(response, event.origin);
      };

      dispatch(request.fn, request.args ?? [])
        .then((result) => reply({ result }))
        .catch((err: unknown) => reply({ error: err instanceof Error ? err.message : "Bridge request failed." }));
    }

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, []);
}
