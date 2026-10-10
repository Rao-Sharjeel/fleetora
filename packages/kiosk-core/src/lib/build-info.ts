/**
 * Identifies the built bundle.
 *
 * Both values are injected at build time: VITE_BUILD_ID is the commit the
 * image was built from (passed down from the deploy), VITE_BUILT_AT the moment
 * it was built. Neither exists in a dev server, which is what "dev" means.
 */
const BUILD_ID = import.meta.env.VITE_BUILD_ID as string | undefined;
const BUILT_AT = import.meta.env.VITE_BUILT_AT as string | undefined;

/** e.g. "401354d · 10 Oct 14:22" — short enough to sit in a footer. */
export function getBuildId(): string {
  if (!BUILD_ID && !BUILT_AT) return "dev";
  const when = BUILT_AT
    ? new Date(BUILT_AT).toLocaleString(undefined, {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;
  return [BUILD_ID ?? "unknown", when].filter(Boolean).join(" · ");
}
