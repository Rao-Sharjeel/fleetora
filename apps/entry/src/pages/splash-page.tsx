import { SplashScreen } from "@fleetora/kiosk-core";
import { useEntrySession } from "@/state/entry-session";

export function SplashPage() {
  const setStep = useEntrySession((s) => s.setStep);
  return <SplashScreen wordmark="ENTRY" onBegin={() => setStep("SCAN_GUARD")} />;
}
