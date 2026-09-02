/** Case/dash/space-insensitive comparison for registration numbers (OCR guess vs. QR-resolved value). */
export function normalizePlate(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function platesMatch(a: string, b: string): boolean {
  return normalizePlate(a) === normalizePlate(b);
}
