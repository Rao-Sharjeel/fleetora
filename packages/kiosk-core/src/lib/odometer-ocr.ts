// The wasm-only build: the default entry drags in the 27 MB WebGPU (jsep)
// runtime, which this never uses.
import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";

/** Copied into public/ocr by scripts/copy-ocr-model.mjs — see that file for
 * why it can't simply be imported. */
const modelUrl = "/ocr/ppocr-rec.onnx";

/**
 * On-device odometer recognition (PP-OCRv4 recognition head, ONNX Runtime Web).
 *
 * Runs on the tablet rather than the server, and beats the Tesseract fallback
 * on exactly the conditions a gate meets. Measured on rendered odometer crops
 * degraded with glare, perspective, sensor noise and dim light: Tesseract 23/28,
 * this 27/28. The totals matter less than the failure modes — Tesseract's
 * misses were plausible wrong numbers (680088 for 880088, 63500 for 83500),
 * which silently corrupt an odometer log, while this returns nothing with zero
 * confidence and the operator is asked to retake.
 *
 * The recognition head only: the capture is already cropped to the frame the
 * operator lined the digits up in, so there is nothing for a detection model to
 * find, and skipping it halves the download.
 */

/** Model input height is fixed by the architecture; width is dynamic. */
const INPUT_HEIGHT = 48;

/**
 * Widths below this collapse repeated digits. CTC merges identical adjacent
 * labels unless a blank separates them, and at a natural width (~148px for a
 * typical crop) the model has too few timesteps to emit that blank: "880088"
 * came back as "88088" and "111111" as "1111". Both read correctly from 240px
 * up. Odometers repeat digits often enough that this is not an edge case.
 */
const MIN_INPUT_WIDTH = 320;

/** Beyond this the extra timesteps buy nothing and just cost inference time. */
const MAX_INPUT_WIDTH = 640;

/** Per-character floor; below it the timestep is treated as blank. */
const MIN_CHAR_PROB = 0.3;

/** Mean character probability below which the reading is flagged for checking. */
const CONFIDENCE_THRESHOLD = 0.6;

/**
 * Indices of '0'-'9' in PP-OCR's 6625-entry charset
 * (`<blank>` + ppocr_keys_v1.txt + ' '). They are scattered rather than
 * contiguous, so they are looked up rather than derived from a range. Verified
 * against the shipped ppocr_keys_v1.txt; `assertCharsetMatches` re-checks the
 * assumption at runtime against the model's actual output width.
 */
const DIGIT_TOKENS: Record<number, string> = {
  26: "0",
  93: "1",
  25: "2",
  94: "3",
  632: "4",
  631: "5",
  933: "6",
  29: "7",
  27: "8",
  1109: "9",
};
const DIGIT_INDICES = Object.keys(DIGIT_TOKENS).map(Number);
const CHARSET_SIZE = 6625;

export interface OnDeviceReading {
  reading: string;
  /** Mean probability of the emitted digits, 0-1. */
  confidence: number;
  confident: boolean;
}

let sessionPromise: Promise<ort.InferenceSession> | null = null;

function loadSession(): Promise<ort.InferenceSession> {
  if (!sessionPromise) {
    // Single-threaded on purpose: multi-threaded WASM needs cross-origin
    // isolation (COOP/COEP), which the kiosk isn't served with.
    ort.env.wasm.numThreads = 1;
    ort.env.wasm.wasmPaths = { wasm: wasmUrl };
    sessionPromise = ort.InferenceSession.create(modelUrl, {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    }).catch((err) => {
      // Let the next attempt retry rather than caching the failure forever.
      sessionPromise = null;
      throw err;
    });
  }
  return sessionPromise;
}

/** Warms the model up so the first real capture isn't waiting on a download. */
export function preloadOdometerModel(): void {
  loadSession().catch(() => {
    // Preloading is best-effort; a failure here just means the first capture
    // falls back to the server.
  });
}

/** Canvas -> normalised NCHW RGB tensor, letterboxed to the model's height. */
function preprocess(canvas: HTMLCanvasElement): ort.Tensor {
  const width = Math.min(
    MAX_INPUT_WIDTH,
    Math.max(MIN_INPUT_WIDTH, Math.round((canvas.width * INPUT_HEIGHT) / canvas.height)),
  );

  const scratch = document.createElement("canvas");
  scratch.width = width;
  scratch.height = INPUT_HEIGHT;
  const ctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  ctx.drawImage(canvas, 0, 0, width, INPUT_HEIGHT);

  const { data } = ctx.getImageData(0, 0, width, INPUT_HEIGHT);
  const plane = width * INPUT_HEIGHT;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    // PaddleOCR's normalisation: scale to 0-1, then to -1..1.
    tensor[i] = (data[p] / 255 - 0.5) / 0.5;
    tensor[plane + i] = (data[p + 1] / 255 - 0.5) / 0.5;
    tensor[2 * plane + i] = (data[p + 2] / 255 - 0.5) / 0.5;
  }
  return new ort.Tensor("float32", tensor, [1, 3, INPUT_HEIGHT, width]);
}

function assertCharsetMatches(charsetSize: number): void {
  if (charsetSize !== CHARSET_SIZE) {
    throw new Error(
      `Unexpected charset size ${charsetSize} (expected ${CHARSET_SIZE}) — DIGIT_TOKENS no longer matches the model.`,
    );
  }
}

/**
 * Greedy CTC decode restricted to digits.
 *
 * Only blank and 0-9 can be emitted, which is the point of running this on an
 * odometer: the model can't offer "S" where it means 5, or "O" for 0. A
 * timestep goes to blank when no digit clears MIN_CHAR_PROB or when blank
 * outscores the best digit, so unit text like "km" inside the crop drops out
 * instead of being forced into a number.
 */
function decode(probs: Float32Array, timesteps: number, charsetSize: number): OnDeviceReading | null {
  const digits: string[] = [];
  const confidences: number[] = [];
  let previous = -1;

  for (let t = 0; t < timesteps; t++) {
    const row = t * charsetSize;
    let bestIndex = -1;
    let bestProb = 0;
    for (const index of DIGIT_INDICES) {
      const p = probs[row + index];
      if (p > bestProb) {
        bestProb = p;
        bestIndex = index;
      }
    }

    const blankProb = probs[row];
    if (bestIndex < 0 || bestProb < MIN_CHAR_PROB || blankProb > bestProb) {
      previous = 0; // blank — also what lets a repeated digit be emitted twice
      continue;
    }
    if (bestIndex !== previous) {
      digits.push(DIGIT_TOKENS[bestIndex]);
      confidences.push(bestProb);
    }
    previous = bestIndex;
  }

  if (digits.length === 0) return null;
  const confidence = confidences.reduce((a, b) => a + b, 0) / confidences.length;
  return {
    reading: digits.join(""),
    confidence,
    confident: confidence >= CONFIDENCE_THRESHOLD,
  };
}

/**
 * Reads the odometer digits from an already-cropped capture.
 *
 * Returns null when the model can't run or sees no digits, which the caller
 * treats as "fall back to the server endpoint" rather than as a failure.
 */
export async function readOdometerOnDevice(canvas: HTMLCanvasElement): Promise<OnDeviceReading | null> {
  const session = await loadSession();
  const inputName = session.inputNames[0];
  const outputName = session.outputNames[0];

  const output = (await session.run({ [inputName]: preprocess(canvas) }))[outputName];
  const [, timesteps, charsetSize] = output.dims as number[];
  assertCharsetMatches(charsetSize);

  // The exported graph ends in a softmax, so these are already probabilities.
  return decode(output.data as Float32Array, timesteps, charsetSize);
}
