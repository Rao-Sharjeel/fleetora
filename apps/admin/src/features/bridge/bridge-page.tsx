import { useBridgeHost } from "@/features/bridge/bridge-host";

/** Renders nothing — a kiosk app embeds this route in a hidden iframe purely to run the bridge listener. */
export function BridgePage() {
  useBridgeHost();
  return null;
}
