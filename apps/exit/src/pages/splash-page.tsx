import { SplashScreen } from "@fleetora/kiosk-core";
import { useExitSession } from "@/state/exit-session";

export function SplashPage() {
  const setStep = useExitSession((s) => s.setStep);
  return <SplashScreen wordmark="EXIT" onBegin={() => setStep("SCAN_GUARD")} />;
}
