import { useEffect, type ReactNode } from "react";
import { useDeviceSession } from "../state/device-session";
import { getKioskDeviceSelf } from "../lib/kiosk-api";
import { PairingScreen } from "./pairing-screen";

/** Shows the pairing screen until this device has a valid key. Reacts live to
 * unpair() — if the api-client detects a 401 (device revoked) mid-use, this
 * drops straight back to pairing on the next render. */
export function DeviceGate({ children }: { children: ReactNode }) {
  const apiKey = useDeviceSession((s) => s.apiKey);
  const setApps = useDeviceSession((s) => s.setApps);

  useEffect(() => {
    if (!apiKey) return;
    // Asked once per launch, not just when the list is empty: an admin can
    // widen or narrow a key long after it was claimed, and a device paired
    // against one of the old single-function builds has no list at all.
    // A failure is left alone deliberately — a gate phone is often offline,
    // and the stored list is the right thing to keep working from.
    getKioskDeviceSelf()
      .then((self) => setApps(self.apps))
      .catch(() => undefined);
  }, [apiKey, setApps]);

  if (!apiKey) {
    return <PairingScreen />;
  }

  return <>{children}</>;
}
