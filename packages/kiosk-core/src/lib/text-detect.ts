import * as ort from "onnxruntime-web/wasm";

/**
 * Text-line detection (PP-OCRv4 detection head) for the odometer capture.
 *
 * Replaces the fixed crop band the operator had to aim: the detector finds the
 * digits wherever they sit on the cluster. On real dashboards the odometer
 * turned up bottom-right, mid-left and dead centre, and a fixed band missed it.
 *
 * The geometry here — 8-connected components, convex hull, rotating-calipers
 * minimum-area rectangle — is a deliberate reimplementation of what OpenCV's
 * findContours/minAreaRect do in the Python evaluation harness, because there
 * is no OpenCV in the browser. It was validated against that harness on real
 * photos: identical answers on all 8, including the one it declines to read.
 * Neither shortcut works — 4-connectivity and axis-aligned boxes each produced
 * a *wrong* reading on a photo where this declines.
 */

export interface TextBox {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  /** Mean detection probability inside the region. */
  score: number;
}

/** Longest edge the detector sees. Bigger is slower for no measured gain. */
const DETECT_LIMIT = 960;

/** The model's stride — input dimensions must be multiples of this. */
const STRIDE = 32;

/** Probability above which a pixel counts as text. */
const MASK_THRESHOLD = 0.3;

/** Mean probability a region must reach to be kept. */
const BOX_THRESHOLD = 0.5;

/** Regions smaller than this are noise, not glyphs. */
const MIN_REGION_PIXELS = 20;

/** PP-OCR grows each detected box before recognition ("unclip"). */
const UNCLIP = 1.8;

/** Smallest usable box in source pixels. */
const MIN_BOX_EDGE = 8;

// The detection head is trained on ImageNet-normalised input, unlike the
// recognition head which wants a plain -1..1 range.
const MEAN = [0.485, 0.456, 0.406];
const STD = [0.229, 0.224, 0.225];

type Point = [number, number];

/** Andrew's monotone chain. Returns hull points in counter-clockwise order. */
function convexHull(points: Point[]): Point[] {
  if (points.length <= 2) return points;
  const sorted = [...points].sort((a, b) => (a[0] - b[0]) || (a[1] - b[1]));

  const half = (seq: Point[]): Point[] => {
    const out: Point[] = [];
    for (const p of seq) {
      while (out.length >= 2) {
        const [x1, y1] = out[out.length - 2];
        const [x2, y2] = out[out.length - 1];
        // Drop the previous point when it doesn't turn the right way.
        if ((x2 - x1) * (p[1] - y1) - (y2 - y1) * (p[0] - x1) <= 0) out.pop();
        else break;
      }
      out.push(p);
    }
    return out;
  };

  const lower = half(sorted);
  const upper = half([...sorted].reverse());
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

interface RotatedRect {
  cx: number;
  cy: number;
  width: number;
  height: number;
  angle: number;
}

/**
 * Smallest rectangle enclosing the points, by rotating calipers.
 *
 * The minimum-area rectangle always shares an edge with the convex hull, so
 * trying each hull edge as the rectangle's axis finds it. This matters over a
 * plain bounding box because text on an angled dashboard gets a box aligned to
 * the text rather than to the image, and the growth below then extends along
 * the digits instead of sweeping in whatever sits above and below them.
 */
function minAreaRect(points: Point[]): RotatedRect {
  const hull = convexHull(points);
  if (hull.length < 3) {
    const xs = points.map((p) => p[0]);
    const ys = points.map((p) => p[1]);
    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);
    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);
    return {
      cx: (minX + maxX) / 2,
      cy: (minY + maxY) / 2,
      width: maxX - minX + 1,
      height: maxY - minY + 1,
      angle: 0,
    };
  }

  let best: RotatedRect | null = null;
  let bestArea = Infinity;
  for (let i = 0; i < hull.length; i++) {
    const [x1, y1] = hull[i];
    const [x2, y2] = hull[(i + 1) % hull.length];
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const cos = Math.cos(-angle);
    const sin = Math.sin(-angle);

    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const [px, py] of hull) {
      const u = px * cos - py * sin;
      const v = px * sin + py * cos;
      if (u < minU) minU = u;
      if (u > maxU) maxU = u;
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
    const width = maxU - minU;
    const height = maxV - minV;
    const area = width * height;
    if (area < bestArea) {
      bestArea = area;
      const cu = (minU + maxU) / 2;
      const cv = (minV + maxV) / 2;
      best = {
        cx: cu * Math.cos(angle) - cv * Math.sin(angle),
        cy: cu * Math.sin(angle) + cv * Math.cos(angle),
        width,
        height,
        angle,
      };
    }
  }
  return best!;
}

/** Draws the source onto a working canvas at the detector's input size. */
function toDetectorInput(source: CanvasImageSource, sw: number, sh: number) {
  const scale = DETECT_LIMIT / Math.max(sw, sh);
  const width = Math.max(STRIDE, Math.round((sw * scale) / STRIDE) * STRIDE);
  const height = Math.max(STRIDE, Math.round((sh * scale) / STRIDE) * STRIDE);

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

  const { data } = ctx.getImageData(0, 0, width, height);
  const plane = width * height;
  const tensor = new Float32Array(3 * plane);
  for (let i = 0; i < plane; i++) {
    const p = i * 4;
    tensor[i] = (data[p] / 255 - MEAN[0]) / STD[0];
    tensor[plane + i] = (data[p + 1] / 255 - MEAN[1]) / STD[1];
    tensor[2 * plane + i] = (data[p + 2] / 255 - MEAN[2]) / STD[2];
  }
  return { tensor: new ort.Tensor("float32", tensor, [1, 3, height, width]), width, height };
}

/**
 * Finds text regions, in the source image's own pixel coordinates.
 */
export async function detectTextBoxes(
  session: ort.InferenceSession,
  source: CanvasImageSource,
  sourceWidth: number,
  sourceHeight: number,
): Promise<TextBox[]> {
  const { tensor, width, height } = toDetectorInput(source, sourceWidth, sourceHeight);
  const output = (await session.run({ [session.inputNames[0]]: tensor }))[session.outputNames[0]];
  const prob = output.data as Float32Array;

  const total = width * height;
  const seen = new Uint8Array(total);
  const stack = new Int32Array(total);
  const boxes: TextBox[] = [];

  for (let start = 0; start < total; start++) {
    if (seen[start] || prob[start] <= MASK_THRESHOLD) continue;

    // Flood fill this region. 8-connected, matching OpenCV — 4-connectivity
    // splits glyph runs differently and measurably changed a reading.
    let top = 0;
    stack[top++] = start;
    seen[start] = 1;
    const pixels: Point[] = [];
    let sum = 0;

    while (top > 0) {
      const p = stack[--top];
      const y = (p / width) | 0;
      const x = p - y * width;
      pixels.push([x, y]);
      sum += prob[p];

      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if ((dx === 0 && dy === 0) || nx < 0 || nx >= width) continue;
          const q = ny * width + nx;
          if (!seen[q] && prob[q] > MASK_THRESHOLD) {
            seen[q] = 1;
            stack[top++] = q;
          }
        }
      }
    }

    if (pixels.length < MIN_REGION_PIXELS) continue;
    const score = sum / pixels.length;
    if (score < BOX_THRESHOLD) continue;

    const rect = minAreaRect(pixels);
    const halfW = (rect.width * UNCLIP) / 2;
    const halfH = (rect.height * UNCLIP) / 2;
    const cos = Math.cos(rect.angle);
    const sin = Math.sin(rect.angle);

    let minX = Infinity;
    let maxX = -Infinity;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [dx, dy] of [
      [-halfW, -halfH],
      [halfW, -halfH],
      [halfW, halfH],
      [-halfW, halfH],
    ]) {
      const cx = rect.cx + dx * cos - dy * sin;
      const cy = rect.cy + dx * sin + dy * cos;
      if (cx < minX) minX = cx;
      if (cx > maxX) maxX = cx;
      if (cy < minY) minY = cy;
      if (cy > maxY) maxY = cy;
    }

    const x1 = Math.max(0, (minX / width) * sourceWidth);
    const x2 = Math.min(sourceWidth, (maxX / width) * sourceWidth);
    const y1 = Math.max(0, (minY / height) * sourceHeight);
    const y2 = Math.min(sourceHeight, (maxY / height) * sourceHeight);
    if (x2 - x1 < MIN_BOX_EDGE || y2 - y1 < MIN_BOX_EDGE) continue;

    boxes.push({ x1: Math.round(x1), y1: Math.round(y1), x2: Math.round(x2), y2: Math.round(y2), score });
  }

  return boxes;
}

/** Fraction of the smaller box covered by the overlap. */
function overlapRatio(a: TextBox, b: TextBox): number {
  const ix1 = Math.max(a.x1, b.x1);
  const iy1 = Math.max(a.y1, b.y1);
  const ix2 = Math.min(a.x2, b.x2);
  const iy2 = Math.min(a.y2, b.y2);
  if (ix2 <= ix1 || iy2 <= iy1) return 0;
  const intersection = (ix2 - ix1) * (iy2 - iy1);
  const smaller = Math.min((a.x2 - a.x1) * (a.y2 - a.y1), (b.x2 - b.x1) * (b.y2 - b.y1));
  return smaller > 0 ? intersection / smaller : 0;
}

/**
 * Merges boxes from several detection passes.
 *
 * Largest first, deliberately: the overlap test is intersection-over-smaller,
 * so a wide box containing a narrow one looks like a duplicate of it. Merging
 * in detection order therefore threw away the fuller crop and left a reading
 * missing its leading digits.
 */
export function mergeBoxes(groups: TextBox[][], threshold = 0.5): TextBox[] {
  const all = groups.flat();
  all.sort((a, b) => (b.x2 - b.x1) * (b.y2 - b.y1) - (a.x2 - a.x1) * (a.y2 - a.y1));
  const merged: TextBox[] = [];
  for (const box of all) {
    if (!merged.some((kept) => overlapRatio(box, kept) >= threshold)) merged.push(box);
  }
  return merged;
}
