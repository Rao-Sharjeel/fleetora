import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// For react-hook-form's `setValueAs` on an optional numeric field: a native number input's
// value is "" when empty, and `Number("")` is 0 (a valid-looking but wrong value) while
// `valueAsNumber`-style parsing yields NaN — which zod's `.optional()` rejects because NaN
// isn't `undefined`. Route empty through undefined so the field validates as genuinely absent.
export function emptyToUndefined(value: string): number | undefined {
  return value === "" ? undefined : Number(value);
}

// Same problem, string-valued fields: an empty optional <input type="date"> submits "" rather
// than being omitted, and the Django backend's DateField rejects "" as a malformed date instead
// of treating it as absent. Route empty through undefined so JSON.stringify drops the key.
export function emptyStringToUndefined(value: string): string | undefined {
  return value === "" ? undefined : value;
}

// Backend photo fields accept a base64 data URL in place of a multipart upload
// (see Base64ImageField) — this reads the file the same way PhotoCapture hands
// it back and turns it into that string.
export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
