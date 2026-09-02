/** Accepts string too — DRF serializes DecimalFields as strings on the wire, and
 * optional numeric fields (e.g. Vehicle.oilChangeKm) come back as null, not 0. */
export function formatKm(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `${Number(value).toLocaleString()} KM`;
}

export function formatCurrency(value: number | string | null | undefined): string {
  if (value === null || value === undefined) return "—";
  return `Rs. ${Number(value).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
}
