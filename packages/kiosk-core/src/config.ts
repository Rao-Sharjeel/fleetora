export type KioskApp = "exit" | "entry" | "fuel";

interface KioskConfig {
  /** The word after FLEETORA in the header — "EXIT", "ENTRY", "FUEL". */
  wordmark: string;
  /** Which app this is, lowercase — sent when claiming a device key so an Exit
   * key can't be redeemed by the Fuel app, even on the same tablet. */
  app: KioskApp;
}

let config: KioskConfig = { wordmark: "", app: "exit" };

/** Called once from each kiosk app's main.tsx, so shared chrome (the header
 * wordmark) doesn't have to be prop-drilled through every page. */
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
