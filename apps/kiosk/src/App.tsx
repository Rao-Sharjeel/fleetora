import { useKioskMode } from "@/state/kiosk-mode";
import { LauncherPage } from "@/pages/launcher-page";
import { ExitFlow } from "@/flows/exit/flow";
import { EntryFlow } from "@/flows/entry/flow";
import { FuelFlow } from "@/flows/fuel/flow";

/**
 * One app for all three gate functions, chosen from the launcher.
 *
 * The three used to be separate builds on separate subdomains, which meant a
 * guard's phone carried three installs, three pairings and three copies of the
 * 15 MB odometer OCR model. They were never three programs — the flows share
 * eleven of their screens and all of kiosk-core.
 */
export default function App() {
  const mode = useKioskMode((s) => s.mode);

  switch (mode) {
    case "exit":
      return <ExitFlow />;
    case "entry":
      return <EntryFlow />;
    case "fuel":
      return <FuelFlow />;
    default:
      return <LauncherPage />;
  }
}
