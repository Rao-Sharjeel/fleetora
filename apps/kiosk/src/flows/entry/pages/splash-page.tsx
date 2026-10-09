import { LauncherPage } from "@/pages/launcher-page";

/**
 * The step a flow resets to after every transaction. In the merged app that
 * is the launcher, not an Entry-only "tap to begin" — finishing one
 * record should leave the guard free to pick any function for the next
 * vehicle, which is what the three-button home screen is for.
 */
export function SplashPage() {
  return <LauncherPage />;
}
