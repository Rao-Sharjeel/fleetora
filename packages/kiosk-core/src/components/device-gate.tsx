import type { ReactNode } from "react";
import { useDeviceSession } from "../state/device-session";
import { PairingScreen } from "./pairing-screen";

/** Shows the pairing screen until this device has a valid key. Reacts live to
 * unpair() — if the api-client detects a 401 (device revoked) mid-use, this
 * drops straight back to pairing on the next render. */
export function DeviceGate({ children }: { children: ReactNode }) {
  const apiKey = useDeviceSession((s) => s.apiKey);

  if (!apiKey) {
    return <PairingScreen />;
  }

  return <>{children}</>;
}
