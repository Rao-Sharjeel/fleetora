interface KioskConfig {
  /** The word after FLEETORA in the header — "EXIT", "ENTRY", "FUEL". */
  wordmark: string;
}

let config: KioskConfig = { wordmark: "" };

/** Called once from each kiosk app's main.tsx, so shared chrome (the header
 * wordmark) doesn't have to be prop-drilled through every page. */
export function configureKiosk(next: KioskConfig): void {
  config = next;
}

export function getKioskConfig(): KioskConfig {
  return config;
}
