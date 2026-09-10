/**
 * Frame selection and cropping for the odometer capture.
 *
 * Two problems this solves, both of which were quietly costing accuracy:
 *
 * 1. The dashed capture frame was decorative — `capture()` sent the whole
 *    video frame, so the OCR was handed an entire dashboard while being told
 *    (`--psm 7`) to expect a single line of text.
 * 2. A single frame grabbed on tap is a lottery: autofocus may still be
 *    hunting, or the operator's tap may shake the tablet. The QR path already
 *    samples the live feed continuously for exactly this reason.
 */

/** How many frames to sample before picking the sharpest. */
export const BURST_FRAMES = 6;

/** Gap between burst frames (ms) — long enough for autofocus to move on. */
export const BURST_INTERVAL_MS = 90;

/**
 * Maps a rectangle drawn over a video element (in CSS pixels, relative to the
 * element) onto coordinates in the video's own pixel grid.
 *
 * The video is rendered with `object-fit: cover`, so it's scaled up until it
 * fills the element and the overflow is clipped — the visible region is a
 * centred sub-rectangle of the source, not the whole thing. Cropping without
 * accounting for that would grab the wrong part of the image.
 */
export function mapOverlayToVideoRect(
  video: HTMLVideoElement,
  overlay: { left: number; top: number; width: number; height: number },
): { x: number; y: number; width: number; height: number } {
  const { videoWidth: vw, videoHeight: vh } = video;
  const boxW = video.clientWidth;
  const boxH = video.clientHeight;

  // `cover` scales by whichever axis needs the most magnification.
  const scale = Math.max(boxW / vw, boxH / vh);
  const displayedW = vw * scale;
  const displayedH = vh * scale;
  // Overflow is split evenly on both sides, so half of it is hidden each side.
  const offsetX = (displayedW - boxW) / 2;
  const offsetY = (displayedH - boxH) / 2;

  const x = (overlay.left + offsetX) / scale;
  const y = (overlay.top + offsetY) / scale;
  const width = overlay.width / scale;
  const height = overlay.height / scale;

  // Clamp so a rounding error near the edge can't produce an out-of-bounds crop.
  const clampedX = Math.max(0, Math.min(x, vw));
  const clampedY = Math.max(0, Math.min(y, vh));
  return {
    x: clampedX,
    y: clampedY,
    width: Math.max(1, Math.min(width, vw - clampedX)),
    height: Math.max(1, Math.min(height, vh - clampedY)),
  };
}

/** Draws a region of the video into a new canvas at source resolution. */
export function cropVideoToCanvas(
  video: HTMLVideoElement,
  rect: { x: number; y: number; width: number; height: number },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(rect.width);
  canvas.height = Math.round(rect.height);
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.drawImage(
      video,
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      0,
      0,
      canvas.width,
      canvas.height,
    );
  }
  return canvas;
}

/**
 * Scores how sharp an image is, as the variance of its luminance gradient.
 *
 * A blurred photo has gentle transitions between neighbouring pixels, so the
 * gradient stays small and its variance is low; a crisp one has hard edges at
 * every digit boundary, which spreads the gradient out. Comparing this across
 * the burst picks the frame that landed in focus. The absolute number is
 * meaningless — it's only ever compared between frames of the same scene.
 */
export function sharpnessScore(canvas: HTMLCanvasElement): number {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return 0;

  // Score a downscaled copy: sharpness ranking is preserved, and this keeps a
  // 6-frame burst from stalling the tablet on full-resolution pixel loops.
  const w = Math.min(canvas.width, 320);
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!sctx) return 0;
  sctx.drawImage(canvas, 0, 0, w, h);

  const { data } = sctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    gray[i] = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
  }

  let sum = 0;
  let sumSq = 0;
  let count = 0;
  // 4-neighbour Laplacian: how much each pixel differs from its surroundings.
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const i = y * w + x;
      const lap = gray[i - 1] + gray[i + 1] + gray[i - w] + gray[i + w] - 4 * gray[i];
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  if (count === 0) return 0;
  const mean = sum / count;
  return sumSq / count - mean * mean;
}

/**
 * Grabs several crops in quick succession and returns the sharpest, so a frame
 * caught mid-autofocus or during the tap's wobble doesn't decide the reading.
 */
export async function captureSharpestCrop(
  video: HTMLVideoElement,
  getRect: () => { x: number; y: number; width: number; height: number },
  frames = BURST_FRAMES,
  intervalMs = BURST_INTERVAL_MS,
): Promise<HTMLCanvasElement | null> {
  let best: HTMLCanvasElement | null = null;
  let bestScore = -Infinity;

  for (let i = 0; i < frames; i++) {
    if (video.videoWidth === 0) break;
    const canvas = cropVideoToCanvas(video, getRect());
    const score = sharpnessScore(canvas);
    if (score > bestScore) {
      bestScore = score;
      best = canvas;
    }
    if (i < frames - 1) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }
  return best;
}
