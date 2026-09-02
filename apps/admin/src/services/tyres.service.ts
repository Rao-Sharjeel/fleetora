import type { Tyre } from "@/types";
import { getDb, delay } from "@/services/mock/db";

export async function listTyres(): Promise<Tyre[]> {
  return delay([...getDb().tyres]);
}

export function tyreMileage(tyre: Tyre, currentOdometer: number): number {
  if (!tyre.installOdometer) return 0;
  return Math.max(0, currentOdometer - tyre.installOdometer);
}

export function tyreRemainingKm(tyre: Tyre, currentOdometer: number): number {
  return tyre.expectedLifeKm - tyreMileage(tyre, currentOdometer);
}
