// The wasm-only build: the default entry drags in the 27 MB WebGPU (jsep)
// runtime, which this never uses.
import * as ort from "onnxruntime-web/wasm";
import wasmUrl from "onnxruntime-web/ort-wasm-simd-threaded.wasm?url";
import { detectTextBoxes, mergeBoxes, type TextBox } from "./text-detect";

/** Copied into public/ocr by scripts/copy-ocr-model.mjs — see that file for
 * why they can't simply be imported. */
const REC_MODEL_URL = "/ocr/ppocr-rec.onnx";
const DET_MODEL_URL = "/ocr/ppocr-det.onnx";

/**
 * On-device odometer reading (PP-OCRv4, ONNX Runtime Web).
 *
 * Measured against real dashboard photos, not rendered text — synthetic images
 * misrepresented real clusters badly enough to be misleading, scoring 27/28 on
 * a pipeline that then failed on the first real photo. On 8 real photos this
 * reads 7 correctly, gets 0 wrong, and declines 1: a mechanical drum caught
 * mid-roll, where the digit is genuinely ambiguous. The server's Tesseract
 * path reads 1 of the same 8.
 *
 * Wrong readings matter far more than declines. A decline costs the operator a
 * retake; a wrong number silently corrupts the odometer log and every
 * fuel-efficiency and service-interval figure derived from it. The choices
 * below trade hit-rate for that.
 */

/** Model input height is fixed by the architecture; width is dynamic. */
const INPUT_HEIGHT = 48;

/**
 * Widths below this collapse repeated digits. CTC merges identical adjacent
 * labels unless a blank separates them, and at a crop's natural width there are
 * too few timesteps to emit one: "880088" came back as "88088" and "111111" as
 * "1111". Odometers repeat digits often — 385005 and 389775 are both in the
 * real sample set — so this is not an edge case.
 */
const MIN_INPUT_WIDTH = 320;

/** Beyond this the extra timesteps buy nothing and cost inference time. */
const MAX_INPUT_WIDTH = 640;

/** Per-character floor; below it the timestep is treated as blank. */
const MIN_CHAR_PROB = 0.3;

/**
 * A digit below this is offered to the operator to confirm rather than
 * accepted silently. On the one photo that read wrong, the offending digit
 * scored 0.746 while every correct digit across every photo scored at least
 * 0.993 — a wide gap to sit in — and the true digit was the runner-up.
 */
const DIGIT_CONFIRM_BELOW = 0.95;

/** An odometer is realistically 4-7 digits: fewer is a partial read, more has
 * swept in a trip meter or a dial number. */
const MIN_DIGITS = 4;
const MAX_DIGITS = 7;

/** Fraction of crop variants that must agree before a reading is trusted. */
const MIN_VARIANT_AGREEMENT = 5 / 6;

/** Bar for the digits that *were* read in the mid-roll case. Lower than
 * DIGIT_CONFIRM_BELOW because the operator is confirming the result anyway,
 * and on a real drum the readable digits scored as low as 0.948. */
const MID_ROLL_MIN_DIGIT = 0.9;

/**
 * Indices of '0'-'9' in PP-OCR's 6625-entry charset (`<blank>` + keys + ' ').
 * Scattered rather than contiguous, so looked up rather than derived from a
 * range; `assertCharsetMatches` re-checks against the model's output width.
 */
const DIGIT_TOKENS: Record<number, string> = {
  26: "0", 93: "1", 25: "2", 94: "3", 632: "4",
  631: "5", 933: "6", 29: "7", 27: "8", 1109: "9",
};
const DIGIT_INDICES = Object.keys(DIGIT_TOKENS).map(Number);
const CHARSET_SIZE = 6625;

export interface DigitReading {
  digit: string;
  confidence: number;
  /** Other digits the model weighed, best first — what to offer the operator
   * when this position needs confirming. */
  alternatives: string[];
}

export interface OdometerReading {
  /** The reading as digits, e.g. "316785". */
  reading: string;
  /** Mean confidence across the digits. */
  confidence: number;
  digits: DigitReading[];
  /** Positions (0-based) the operator should confirm. Empty means none. */
  uncertainPositions: number[];
  /** True when the digits read cleanly but one trailing digit is missing —
   * a mechanical drum caught mid-roll. The operator supplies the last digit
   * rather than retaking a photo that would look the same. */
  missingTrailingDigit: boolean;
  /** True when nothing needs confirming and the value can be prefilled. */
  confident: boolean;
}

export interface ReadOdometerOptions {
  /** The vehicle's last recorded odometer. Candidates below it are rejected —
   * this is what stops a QR sticker or a dial number being accepted. */
  lastOdometer?: number;
  /** Numbers to never accept, such as the digits of the scanned vehicle QR:
   * its own label appeared as a false candidate in every real photo tested. */
  excludeValues?: number[];
}

let recSession: Promise<ort.InferenceSession> | null = null;
let detSession: Promise<ort.InferenceSession> | null = null;

function createSession(url: string): Promise<ort.InferenceSession> {
  // Single-threaded on purpose: multi-threaded WASM needs cross-origin
  // isolation (COOP/COEP), which the kiosk isn't served with.
  ort.env.wasm.numThreads = 1;
  ort.env.wasm.wasmPaths = { wasm: wasmUrl };
  return ort.InferenceSession.create(url, {
    executionProviders: ["wasm"],
    graphOptimizationLevel: "all",
  });
}

function getRecSession(): Promise<ort.InferenceSession> {
  if (!recSession) {
    // Clear on failure so the next attempt retries rather than caching it.
    recSession = createSession(REC_MODEL_URL).catch((err) => {
      recSession = null;
      throw err;
    });
  }
  return recSession;
}

function getDetSession(): Promise<ort.InferenceSession> {
  if (!detSession) {
    detSession = createSession(DET_MODEL_URL).catch((err) => {
      detSession = null;
      throw err;
    });
  }
  return detSession;
}

/** Warms both models so the first capture isn't waiting on a download. */
export function preloadOdometerModel(): void {
  Promise.all([getRecSession(), getDetSession()]).catch(() => {
    // Best-effort: a failure here just means falling back to the server.
  });
}

function drawTo(source: CanvasImageSource, width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Canvas 2D context unavailable.");
  // Canvas defaults to cheap smoothing, which is visibly worse than the
  // bilinear resampling the Python harness measured against — enough to flip a
  // marginal read on a low-contrast drum.
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, 0, 0, width, height);
  return canvas;
}

function mapGrey(canvas: HTMLCanvasElement, lut: (grey: number) => number): HTMLCanvasElement {
  const out = drawTo(canvas, canvas.width, canvas.height);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const image = ctx.getImageData(0, 0, out.width, out.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    const grey = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    const mapped = lut(grey);
    data[i] = data[i + 1] = data[i + 2] = mapped;
  }
  ctx.putImageData(image, 0, 0);
  return out;
}

/**
 * Grayscale histogram equalisation.
 *
 * A glare-washed truck gauge hid its odometer from the detector completely —
 * nine regions found across the cluster, none covering the digits, though they
 * read fine once cropped by hand. Detecting over an equalised copy finds them.
 */
function equalise(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const histogram = new Uint32Array(256);
  for (let i = 0; i < data.length; i += 4) {
    histogram[(0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0]++;
  }
  const lut = new Uint8Array(256);
  const pixels = canvas.width * canvas.height;
  let cumulative = 0;
  for (let v = 0; v < 256; v++) {
    cumulative += histogram[v];
    lut[v] = Math.round((cumulative / pixels) * 255);
  }
  return mapGrey(canvas, (grey) => lut[grey]);
}

/** Linear contrast stretch to the full range. */
function autoContrast(canvas: HTMLCanvasElement): HTMLCanvasElement {
  const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let lo = 255;
  let hi = 0;
  for (let i = 0; i < data.length; i += 4) {
    const grey = (0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]) | 0;
    if (grey < lo) lo = grey;
    if (grey > hi) hi = grey;
  }
  const span = Math.max(1, hi - lo);
  return mapGrey(canvas, (grey) => Math.max(0, Math.min(255, ((grey - lo) / span) * 255)));
}

/** Multiplies contrast about mid-grey, keeping colour. */
function boostContrast(canvas: HTMLCanvasElement, factor: number): HTMLCanvasElement {
  const out = drawTo(canvas, canvas.width, canvas.height);
  const ctx = out.getContext("2d", { willReadFrequently: true })!;
  const image = ctx.getImageData(0, 0, out.width, out.height);
  const data = image.data;
  for (let i = 0; i < data.length; i += 4) {
    for (let c = 0; c < 3; c++) {
      data[i + c] = Math.max(0, Math.min(255, (data[i + c] - 128) * factor + 128));
    }
  }
  ctx.putImageData(image, 0, 0);
  return out;
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
 * Only blank and 0-9 can be emitted, so the model can't offer "S" where it
 * means 5, and unit text like "km" inside the crop drops out instead of being
 * forced into a number.
 */
function decode(probs: Float32Array, timesteps: number, charsetSize: number): DigitReading[] {
  const digits: DigitReading[] = [];
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
    if (bestIndex < 0 || bestProb < MIN_CHAR_PROB || probs[row] > bestProb) {
      previous = 0; // blank — also what lets a repeated digit be emitted twice
      continue;
    }
    if (bestIndex !== previous) {
      const ranked = [...DIGIT_INDICES].sort((a, b) => probs[row + b] - probs[row + a]);
      digits.push({
        digit: DIGIT_TOKENS[bestIndex],
        confidence: bestProb,
        alternatives: ranked.slice(1, 4).map((i) => DIGIT_TOKENS[i]),
      });
    }
    previous = bestIndex;
  }
  return digits;
}

async function recogniseCrop(session: ort.InferenceSession, crop: HTMLCanvasElement): Promise<DigitReading[]> {
  if (crop.width < 4 || crop.height < 4) return [];
  const width = Math.min(
    MAX_INPUT_WIDTH,
    Math.max(MIN_INPUT_WIDTH, Math.round((crop.width * INPUT_HEIGHT) / crop.height)),
  );
  const scratch = drawTo(crop, width, INPUT_HEIGHT);
  const ctx = scratch.getContext("2d", { willReadFrequently: true })!;
  const { data } = ctx.getImageData(0, 0, width, INPUT_HEIGHT);

  const plane = width * INPUT_HEIGHT;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    // PaddleOCR's normalisation: 0-1, then to -1..1.
    tensor[i] = (data[p] / 255 - 0.5) / 0.5;
    tensor[plane + i] = (data[p + 1] / 255 - 0.5) / 0.5;
    tensor[2 * plane + i] = (data[p + 2] / 255 - 0.5) / 0.5;
  }

  const input = new ort.Tensor("float32", tensor, [1, 3, INPUT_HEIGHT, width]);
  const output = (await session.run({ [session.inputNames[0]]: input }))[session.outputNames[0]];
  const [, timesteps, charsetSize] = output.dims as number[];
  assertCharsetMatches(charsetSize);
  // The exported graph ends in a softmax, so these are already probabilities.
  return decode(output.data as Float32Array, timesteps, charsetSize);
}

/**
 * Crops of one detected box at several paddings and contrasts.
 *
 * PP-OCR's boxes hug the glyphs, and one that shaved the digits read 376785 for
 * 316785 at 0.95 confidence — a wrong value *higher* than the true one, so the
 * last-odometer filter would have passed it. Padding fixes that. And when a
 * crop sits near a decision boundary the answer flips under small changes,
 * which is exactly when it shouldn't be trusted — so disagreement is a signal.
 */
function cropVariants(source: HTMLCanvasElement, box: TextBox, withContrast: boolean): HTMLCanvasElement[] {
  const width = box.x2 - box.x1;
  const height = box.y2 - box.y1;
  const out: HTMLCanvasElement[] = [];
  for (const [padX, padY] of [[0.02, 0.1], [0.04, 0.25], [0.06, 0.4]]) {
    const x1 = Math.max(0, Math.round(box.x1 - width * padX));
    const y1 = Math.max(0, Math.round(box.y1 - height * padY));
    const x2 = Math.min(source.width, Math.round(box.x2 + width * padX));
    const y2 = Math.min(source.height, Math.round(box.y2 + height * padY));
    if (x2 - x1 < 4 || y2 - y1 < 4) continue;

    const crop = document.createElement("canvas");
    crop.width = x2 - x1;
    crop.height = y2 - y1;
    const ctx = crop.getContext("2d", { willReadFrequently: true });
    if (!ctx) continue;
    ctx.drawImage(source, x1, y1, crop.width, crop.height, 0, 0, crop.width, crop.height);
    out.push(crop);
    if (withContrast) out.push(boostContrast(crop, 2.0));
  }
  return out;
}

interface BoxCandidate {
  value: number;
  digits: DigitReading[];
  agreement: number;
  variants: number;
}

/** Reads one detected region across its crop variants and returns whatever
 * plausible odometer values they agreed on. */
async function readBox(
  rec: ort.InferenceSession,
  source: HTMLCanvasElement,
  box: TextBox,
  withContrast: boolean,
  options: ReadOdometerOptions,
): Promise<BoxCandidate[]> {
  const counts = new Map<number, { digits: DigitReading[]; count: number }>();
  let variants = 0;

  for (const crop of cropVariants(source, box, withContrast)) {
    const digits = await recogniseCrop(rec, crop);
    if (digits.length < MIN_DIGITS || digits.length > MAX_DIGITS + 1) continue;
    // Compared as a number, not a string: padding sometimes drags a label edge
    // into the crop and it decodes as a leading zero ("0389775" for 389775),
    // which is the same odometer value.
    const value = Number(digits.map((d) => d.digit).join(""));
    variants++;
    const entry = counts.get(value);
    if (entry) entry.count++;
    else counts.set(value, { digits, count: 1 });
  }
  if (!variants) return [];

  const excluded = new Set(options.excludeValues ?? []);
  const out: BoxCandidate[] = [];
  for (const [value, { digits, count }] of counts) {
    const text = String(value);
    if (text.length < MIN_DIGITS || text.length > MAX_DIGITS) continue;
    if (excluded.has(value)) continue;
    // Deliberately NOT filtered against lastOdometer here: a mid-roll drum
    // reads one digit short, so 65393 against a last reading of 653000 looks
    // too small and would be dropped before the mid-roll check could see it.
    // The comparison happens in pickBest instead.
    out.push({ value, digits, agreement: count, variants });
  }
  return out;
}

/** Best of a set of candidates: agreement first, digit confidence as tie-break.
 *
 * Agreement leads because confidence alone is too thin a discriminator — on one
 * photo two speedo dial numbers merged into an odometer-shaped "120140" scoring
 * 0.9958 against the true value's 0.9984. */
function pickBest(candidates: BoxCandidate[], lastOdometer: number | undefined): BoxCandidate | null {
  let best: BoxCandidate | null = null;
  for (const candidate of candidates) {
    // A reading below the vehicle's last odometer is some other number on the
    // cluster — a trip meter, a dial marking, or the QR sticker.
    if (lastOdometer !== undefined && candidate.value < lastOdometer) continue;
    if (
      !best ||
      candidate.agreement > best.agreement ||
      (candidate.agreement === best.agreement && meanConfidence(candidate.digits) > meanConfidence(best.digits))
    ) {
      best = candidate;
    }
  }
  return best;
}

function meanConfidence(digits: DigitReading[]): number {
  return digits.reduce((sum, d) => sum + d.confidence, 0) / digits.length;
}

function toReading(best: BoxCandidate): OdometerReading {
  const uncertainPositions = best.digits
    .map((d, i) => (d.confidence < DIGIT_CONFIRM_BELOW ? i : -1))
    .filter((i) => i >= 0);
  return {
    reading: String(best.value),
    confidence: meanConfidence(best.digits),
    digits: best.digits,
    uncertainPositions,
    missingTrailingDigit: false,
    confident: uncertainPositions.length === 0,
  };
}

/**
 * A read that is one digit short of what the vehicle's history implies.
 *
 * Both photos this pipeline declines are mechanical drums caught mid-roll,
 * where the last digit sits between two numbers. The other digits read
 * correctly — sample 1 gives 65393 against a true 653931 — so declining throws
 * away five correct digits and asks for a retake that cannot help, because the
 * drum is still between numbers. Offering the trailing position instead turns
 * it into one tap, on the digit a person standing at the vehicle can read
 * better than any model.
 */
function asMissingTrailingDigit(
  candidates: BoxCandidate[],
  lastOdometer: number | undefined,
): OdometerReading | null {
  if (lastOdometer === undefined) return null;
  const expectedDigits = String(lastOdometer).length;

  for (const candidate of candidates.sort((a, b) => b.agreement - a.agreement)) {
    const text = String(candidate.value);
    if (text.length !== expectedDigits - 1) continue;
    // Every digit that *was* read has to be solid, or this is just a bad read.
    if (candidate.digits.some((d) => d.confidence < MID_ROLL_MIN_DIGIT)) continue;
    // With any trailing digit, does it land at or above the last reading?
    if (Number(text + "9") < lastOdometer) continue;
    return {
      reading: text,
      confidence: meanConfidence(candidate.digits),
      digits: candidate.digits,
      uncertainPositions: [text.length],
      missingTrailingDigit: true,
      confident: false,
    };
  }
  return null;
}

/**
 * Reads the odometer from a dashboard capture.
 *
 * Returns null when nothing trustworthy was found, which the caller treats as
 * "ask the operator" rather than as an error.
 */
export async function readOdometerOnDevice(
  source: HTMLCanvasElement,
  options: ReadOdometerOptions = {},
): Promise<OdometerReading | null> {
  const [det, rec] = await Promise.all([getDetSession(), getRecSession()]);

  // Escalating rather than doing everything up front. Running all three
  // detection passes and all six crop variants took ~6s per capture in the
  // browser, which is far too slow for a gate. Most dashboards are read on the
  // first pass; the expensive work now only happens when the cheap attempt
  // comes back empty or unconvincing.
  const attempts: Array<{ extraPasses: () => HTMLCanvasElement[]; withContrast: boolean }> = [
    { extraPasses: () => [], withContrast: false },
    { extraPasses: () => [], withContrast: true },
    { extraPasses: () => [equalise(source), autoContrast(source)], withContrast: true },
  ];

  // Escalation stops here even if untried passes remain. Measured in-browser on
  // real photos: an easy dashboard finishes in ~2.1-2.6s, and the hard ones run
  // up to ~16s. The budget is set above that ceiling deliberately — a rare long
  // wait is preferred to handing the operator a keypad on a reading the
  // pipeline would have got right. The capture screen shows progress
  // throughout, so the wait is visible rather than a frozen screen.
  const DEADLINE_MS = 22000;
  const startedAt = Date.now();

  let allCandidates: BoxCandidate[] = [];
  // Kept across attempts, unlike allCandidates. A mid-roll drum reads cleanly
  // on the cheap first pass and then degrades once contrast is pushed — the
  // separator bars start decoding as 1s — so the good short read has to
  // survive the later attempts that overwrite it.
  const seenCandidates: BoxCandidate[] = [];
  let detected: Awaited<ReturnType<typeof detectTextBoxes>>[] = [];
  for (const [index, attempt] of attempts.entries()) {
    if (index > 0 && Date.now() - startedAt > DEADLINE_MS) break;

    const extra = attempt.extraPasses();
    if (index === 0 || extra.length) {
      // Only re-detect when there is a new pass to run — attempts 1 and 2
      // share one box set and differ only in how hard they read it.
      detected = detected.concat(
        await Promise.all(
          (index === 0 ? [source] : extra).map((pass) =>
            detectTextBoxes(det, pass, source.width, source.height),
          ),
        ),
      );
    }
    const boxes = mergeBoxes(detected);

    allCandidates = [];
    for (const box of boxes) {
      allCandidates.push(...(await readBox(rec, source, box, attempt.withContrast, options)));
    }
    seenCandidates.push(...allCandidates);

    const best = pickBest(allCandidates, options.lastOdometer);
    if (best && best.agreement / best.variants >= MIN_VARIANT_AGREEMENT) {
      return toReading(best);
    }

    // Escalating won't fix a drum that is physically between two numbers, so
    // once a confident short read appears, stop and let the operator supply
    // the digit. Not on the first pass, which is the cheapest and least sure.
    if (index > 0) {
      const midRoll = asMissingTrailingDigit(seenCandidates, options.lastOdometer);
      if (midRoll) return midRoll;
    }
  }

  // Nothing agreed. Before giving up, check whether this is the mid-roll case:
  // a solid read that is simply one digit short.
  return asMissingTrailingDigit(seenCandidates, options.lastOdometer);
}
