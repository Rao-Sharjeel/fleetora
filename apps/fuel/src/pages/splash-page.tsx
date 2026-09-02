import { SplashScreen } from "@fleetora/kiosk-core";
import { useFuelSession } from "@/state/fuel-session";

export function SplashPage() {
  const setStep = useFuelSession((s) => s.setStep);
  return <SplashScreen wordmark="FUEL" onBegin={() => setStep("SCAN_GUARD")} />;
}
