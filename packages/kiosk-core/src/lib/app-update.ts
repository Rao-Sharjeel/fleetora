/**
 * Pulling a new build onto a device that is already running an old one.
 *
 * An installed PWA keeps serving whatever its service worker has cached until
 * that worker is replaced, and a kiosk phone is rarely closed, so "we
 * deployed a fix" and "the phone has the fix" can stay apart for days. These
 * are the two ways to close that gap, deliberately separated because they cost
 * very different amounts.
 */

/** True when a new worker was found and activated — the caller should reload. */
export async function checkForUpdate(): Promise<boolean> {
  if (!("serviceWorker" in navigator)) return false;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) return false;

  await registration.update();

  // update() resolves once the new worker is fetched, but it then sits in
  // `waiting` until every page using the old one goes away — which on a kiosk
  // never happens. Telling it to skip that is the whole point of this button.
  const waiting = registration.waiting;
  if (waiting) {
    waiting.postMessage({ type: "SKIP_WAITING" });
    return true;
  }
  // A worker already installing will become `waiting` shortly; treat that as
  // an update too rather than reporting "up to date" a second before one lands.
  return Boolean(registration.installing);
}

/**
 * The heavy option: drop every cache and registration, then reload.
 *
 * This re-downloads everything, which for a kiosk means the ~15 MB odometer
 * model and the ~14 MB WASM runtime as well as the app — minutes on a weak
 * connection at a gate. Only worth it when a build is wedged badly enough that
 * a normal update will not take.
 */
export async function hardReset(): Promise<void> {
  if ("serviceWorker" in navigator) {
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((r) => r.unregister()));
  }
  if ("caches" in window) {
    const keys = await caches.keys();
    await Promise.all(keys.map((k) => caches.delete(k)));
  }
}
