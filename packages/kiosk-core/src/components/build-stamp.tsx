import { getBuildId } from "../lib/build-info";

/**
 * The build this install is running, shown on the screens an operator reaches
 * without scanning anything.
 *
 * A kiosk is an installed PWA with a service worker, so a phone can keep
 * serving a cached bundle long after a fix has shipped — and from the outside
 * that is indistinguishable from the fix not working. Having the build visible
 * turns "is this the new version?" into something anyone can answer by looking
 * at the phone, instead of a round trip through whoever deployed it.
 */
export function BuildStamp({ className = "" }: { className?: string }) {
  return (
    <span className={`text-[10px] tabular-nums text-kiosk-muted/70 ${className}`}>{getBuildId()}</span>
  );
}
