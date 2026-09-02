import { createWorker, type Worker } from "tesseract.js";

let workerPromise: Promise<Worker> | null = null;

function getWorker(): Promise<Worker> {
  if (!workerPromise) {
    workerPromise = createWorker("eng");
  }
  return workerPromise;
}

/** Best-effort plate text guess from the vehicle-front photo. Always editable by the operator. */
export async function recognizePlateText(image: HTMLCanvasElement): Promise<string> {
  const worker = await getWorker();
  const { data } = await worker.recognize(image);
  return data.text.trim();
}

/** Digit-only OCR of the odometer photo. Always editable by the operator. */
export async function recognizeOdometerDigits(image: HTMLCanvasElement): Promise<string> {
  const worker = await getWorker();
  await worker.setParameters({ tessedit_char_whitelist: "0123456789" });
  try {
    const { data } = await worker.recognize(image);
    return data.text.replace(/[^0-9]/g, "");
  } finally {
    await worker.setParameters({ tessedit_char_whitelist: "" });
  }
}
