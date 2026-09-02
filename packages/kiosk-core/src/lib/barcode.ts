import { BrowserMultiFormatReader } from "@zxing/browser";
import { BarcodeFormat, NotFoundException } from "@zxing/library";

/** The Barcode Detection API isn't in TypeScript's DOM lib yet, so it's typed
 * locally rather than via an ambient global declaration. */
interface DetectedBarcode {
  rawValue: string;
  format: string;
}
interface BarcodeDetectorLike {
  detect(image: ImageBitmapSource): Promise<DetectedBarcode[]>;
}
type BarcodeDetectorConstructor = new (options?: { formats?: string[] }) => BarcodeDetectorLike;

const NativeBarcodeDetector = (globalThis as { BarcodeDetector?: BarcodeDetectorConstructor }).BarcodeDetector;

let qrReader: BrowserMultiFormatReader | null = null;

function getQrReader(): BrowserMultiFormatReader {
  if (!qrReader) {
    qrReader = new BrowserMultiFormatReader();
    qrReader.possibleFormats = [BarcodeFormat.QR_CODE];
  }
  return qrReader;
}

function decodeWithZxing(canvas: HTMLCanvasElement): string | null {
  try {
    return getQrReader().decodeFromCanvas(canvas).getText();
  } catch (err) {
    if (err instanceof NotFoundException) return null;
    return null; // any other decode failure is also treated as "nothing found" — operator retakes the photo
  }
}

/**
 * Decodes a QR code — used for both staff ID cards (Fleetora-issued, encoding the
 * guard/driver's Fleetora ID) and the vehicle QR captured alongside the odometer.
 * Everything scanned by this kiosk is a Fleetora-issued QR code, so there's only one decoder.
 */
export async function decodeQr(canvas: HTMLCanvasElement): Promise<string | null> {
  if (NativeBarcodeDetector) {
    try {
      const detector = new NativeBarcodeDetector({ formats: ["qr_code"] });
      const results = await detector.detect(canvas);
      if (results[0]?.rawValue) return results[0].rawValue;
    } catch {
      // unsupported format or detector error — fall through to the zxing fallback
    }
  }
  return decodeWithZxing(canvas);
}
