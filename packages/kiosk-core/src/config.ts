export type KioskApp = "exit" | "entry" | "fuel";

interface KioskConfig {
  /** The word after FLEETORA in the header — "EXIT", "ENTRY", "FUEL". */
  wordmark: string;
  /** Which single function this build is, if it is only one. The standalone
   * Entry/Fuel builds set it, and it is sent when claiming so their key is
   * checked against it. The merged app leaves it undefined: it pairs once for
   * every function its key allows, and the launcher offers those. */
  app?: KioskApp;
}

let config: KioskConfig = { wordmark: "" };

/** Called from a kiosk app's main.tsx, and again by the merged app each time a
 * flow is chosen, so shared chrome (the header wordmark) doesn't have to be
 * prop-drilled through every page. Not reactive on its own — callers set it in
 * the same handler that changes the state driving the re-render, so the next
 * render reads the new value. */
export function configureKiosk(next: KioskConfig): void {
  config = next;
}

export function getKioskConfig(): KioskConfig {
  return config;
}

/** Reads a guard may attempt before being offered the "can't read it" route.
 * Three is enough to rule out a bad angle or a smudge without turning the gate
 * into a queue of people re-photographing the same cluster. */
export const ODOMETER_ATTEMPT_LIMIT = 3;
