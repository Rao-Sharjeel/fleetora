import type { Trip, FuelEntry } from "@/types";

export interface DailyPoint {
  date: string;
  label: string;
  km: number;
  fuelCost: number;
}

/** Last `days` calendar days (oldest first), each bucketed from trip/fuel records that fell on it. */
export function buildDailySeries(trips: Trip[], fuelEntries: FuelEntry[], days = 14): DailyPoint[] {
  const buckets = new Map<string, DailyPoint>();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    d.setHours(0, 0, 0, 0);
    const key = d.toDateString();
    buckets.set(key, {
      date: key,
      label: d.toLocaleDateString(undefined, { day: "2-digit", month: "short" }),
      km: 0,
      fuelCost: 0,
    });
  }

  for (const trip of trips) {
    const key = new Date(trip.outTime).toDateString();
    const bucket = buckets.get(key);
    if (bucket) bucket.km += trip.tripKm ?? 0;
  }

  for (const entry of fuelEntries) {
    const key = new Date(entry.dateTime).toDateString();
    const bucket = buckets.get(key);
    if (bucket) bucket.fuelCost += entry.total;
  }

  return Array.from(buckets.values());
}

export interface StatusCount {
  key: string;
  label: string;
  count: number;
}

export function buildStatusBreakdown(
  vehicles: { status: string }[],
  order: { key: string; label: string }[],
): StatusCount[] {
  return order.map(({ key, label }) => ({
    key,
    label,
    count: vehicles.filter((v) => v.status === key).length,
  }));
}
