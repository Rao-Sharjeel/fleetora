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
 * 3. On a budget phone (the Galaxy A07 the gates actually use) autofocus takes
 *    well over a second to converge, and a burst fired on the tap returns six
 *    uniformly blurred frames. Picking the sharpest of six blurs still yields a
 *    blur, so the capture now *waits* for focus to converge — see
 *    `waitForFocusToSettle` — and measures whether what it got is readable at
 *    all rather than handing mush to the recogniser.
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
 * A crop drawn straight into a small canvas, for the focus sampler.
 *
 * The settle loop below runs every ~110ms on a phone whose CPU is the reason
 * this code exists, and a full-resolution crop per sample would make the wait
 * it is trying to shorten worse. Sharpness ranking survives the downscale, so
 * sampling works at preview-thumbnail size.
 */
export function cropVideoToSmallCanvas(
  video: HTMLVideoElement,
  rect: { x: number; y: number; width: number; height: number },
  maxWidth = 320,
): HTMLCanvasElement {
  const scale = Math.min(1, maxWidth / Math.max(1, rect.width));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(rect.width * scale));
  canvas.height = Math.max(1, Math.round(rect.height * scale));
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx?.drawImage(video, rect.x, rect.y, rect.width, rect.height, 0, 0, canvas.width, canvas.height);
  return canvas;
}

/**
 * Raw and contrast-normalised sharpness for one image.
 *
 * Both come from the variance of the luminance Laplacian: a blurred photo has
 * gentle transitions between neighbouring pixels, so the gradient stays small
 * and its variance is low, while a crisp one has hard edges at every digit
 * boundary, which spreads the gradient out.
 *
 * `laplacian` is that variance as-is. It is only ever meaningful *between
 * frames of the same scene* — it scales with how much contrast the scene has,
 * so a sharp photo of a dim cluster can score below a blurred photo of a
 * sunlit one. That is all a burst needs, since every frame is the same scene.
 *
 * `normalised` divides it by the luminance variance, which cancels that
 * scaling almost exactly: on synthetic digit bands, dropping the contrast to
 * 35% moved `laplacian` by 8x and `normalised` not at all (0.9801 both times).
 * That makes it comparable across scenes and devices, which is what an
 * absolute "is this readable" judgement needs — see `FOCUS_FLOOR`.
 */
export function focusMetrics(canvas: HTMLCanvasElement): { laplacian: number; normalised: number } {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx || canvas.width < 3 || canvas.height < 3) return { laplacian: 0, normalised: 0 };

  // Score a downscaled copy: sharpness ranking is preserved, and this keeps a
  // 6-frame burst from stalling the tablet on full-resolution pixel loops.
  const w = Math.min(canvas.width, 320);
  const h = Math.max(1, Math.round((canvas.height / canvas.width) * w));
  const scratch = document.createElement("canvas");
  scratch.width = w;
  scratch.height = h;
  const sctx = scratch.getContext("2d", { willReadFrequently: true });
  if (!sctx) return { laplacian: 0, normalised: 0 };
  sctx.drawImage(canvas, 0, 0, w, h);

  const { data } = sctx.getImageData(0, 0, w, h);
  const gray = new Float32Array(w * h);
  let graySum = 0;
  let graySumSq = 0;
  for (let i = 0; i < gray.length; i++) {
    const p = i * 4;
    const v = 0.299 * data[p] + 0.587 * data[p + 1] + 0.114 * data[p + 2];
    gray[i] = v;
    graySum += v;
    graySumSq += v * v;
  }
  const grayVar = graySumSq / gray.length - (graySum / gray.length) ** 2;

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
  if (count === 0) return { laplacian: 0, normalised: 0 };
  const mean = sum / count;
  const laplacian = sumSq / count - mean * mean;
  // A flat grey frame has no contrast to normalise against; calling that
  // "sharp" because the divisor is tiny is exactly backwards.
  return { laplacian, normalised: grayVar < 1 ? 0 : laplacian / grayVar };
}

/** Sharpness for ranking frames of one scene against each other. */
export function sharpnessScore(canvas: HTMLCanvasElement): number {
  return focusMetrics(canvas).laplacian;
}

/**
 * Below this normalised score, there are no resolvable edges left in the crop
 * and the recogniser has nothing to work with.
 *
 * Set deliberately low. On synthetic digit bands this is around 12 passes of a
 * 3x3 box blur — thoroughly unreadable — while a focused band scores 0.1 to
 * 1.0, two orders of magnitude clear of it. Sensor noise on a cheap phone adds
 * high-frequency detail and so pushes real frames *up*, which makes a low
 * floor the safe direction to be wrong in: it catches the frames that cannot
 * possibly read and waves through anything arguable. The operator can override
 * it regardless, so a miscalibration costs a tap, never the capture.
 */
export const FOCUS_FLOOR = 0.01;

/** How long to let autofocus converge before giving up on it (ms). */
export const FOCUS_SETTLE_TIMEOUT_MS = 2600;

/** Gap between focus samples while waiting (ms). */
export const FOCUS_SAMPLE_INTERVAL_MS = 110;

/** Consecutive non-improving samples that count as "focus has stopped moving". */
const FOCUS_PLATEAU_SAMPLES = 3;

/** How much better a sample must be to count as focus still improving. */
const FOCUS_IMPROVEMENT_RATIO = 1.1;

/**
 * Whether a series of focus samples has stopped improving.
 *
 * Autofocus climbs: each sample is sharper than the last until the lens
 * reaches the right plane, then the score flattens (and often dips slightly as
 * the hunt overshoots and corrects). Waiting for that flattening is what makes
 * the capture track the lens rather than race it. The 10% band keeps sensor
 * noise and the operator's hand from reading as improvement forever.
 *
 * Pure, and separate from the sampling loop, so the policy can be exercised
 * without a camera.
 */
export function focusHasSettled(
  scores: number[],
  plateau = FOCUS_PLATEAU_SAMPLES,
  improvement = FOCUS_IMPROVEMENT_RATIO,
): boolean {
  if (scores.length < plateau + 1) return false;
  const recent = scores.slice(-plateau);
  const bestBefore = Math.max(...scores.slice(0, -plateau));
  // A scene with no detail at all never "improves", and would otherwise be
  // declared settled on the strength of three equally blank samples.
  if (bestBefore <= 0) return false;
  return !recent.some((score) => score > bestBefore * improvement);
}

export interface FocusWait {
  /** Whether focus actually plateaued, rather than the deadline arriving. */
  settled: boolean;
  /** Best normalised score seen while waiting. */
  best: number;
  /** Every sample, oldest first — the capture logs these on a failed read. */
  scores: number[];
}

/**
 * Waits for the camera to bring `getRect` into focus.
 *
 * This is the fix for the gate phones: `takePhoto()` and a preview burst both
 * return whatever the sensor has *now*, and on a slow-focusing phone that is a
 * frame from the middle of the hunt. Sampling the live preview until the
 * sharpness stops climbing costs under a second on a phone that focuses
 * quickly and buys a readable frame on one that doesn't.
 *
 * Works whether or not the device exposes any focus control: with
 * `single-shot` the caller triggers a refocus first and this watches it land;
 * with nothing at all, continuous autofocus is converging anyway and this
 * waits for the same plateau.
 */
export async function waitForFocusToSettle(
  video: HTMLVideoElement,
  getRect: () => { x: number; y: number; width: number; height: number },
  options: {
    timeoutMs?: number;
    intervalMs?: number;
    /** Checked between samples, so a cancelled capture stops sampling. */
    isCancelled?: () => boolean;
  } = {},
): Promise<FocusWait> {
  const timeoutMs = options.timeoutMs ?? FOCUS_SETTLE_TIMEOUT_MS;
  const intervalMs = options.intervalMs ?? FOCUS_SAMPLE_INTERVAL_MS;
  const deadline = Date.now() + timeoutMs;
  const scores: number[] = [];

  while (Date.now() < deadline) {
    if (options.isCancelled?.() || video.videoWidth === 0) break;
    scores.push(focusMetrics(cropVideoToSmallCanvas(video, getRect())).normalised);
    if (focusHasSettled(scores)) {
      return { settled: true, best: Math.max(...scores), scores };
    }
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
  }

  return { settled: false, best: scores.length ? Math.max(...scores) : 0, scores };
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

/**
 * A still at the camera's *photo* resolution rather than the preview's.
 *
 * The preview stream is typically 1920x1080 even on a phone whose sensor will
 * produce 12 MP, and on a dashboard shot the odometer occupies a small part of
 * the frame — so the digits survive as a few dozen pixels, get downscaled again
 * by the detector's 960px limit, and arrive at the recogniser as mush. A full
 * still gives the same digits several times the pixels.
 *
 * ImageCapture is Android Chrome only; everywhere else this returns null and
 * the caller falls back to the preview burst. takePhoto() also fails on some
 * devices that advertise it, which is why the whole thing is wrapped.
 */
const STILL_TIMEOUT_MS = 1500;

export async function captureStillFrame(track: MediaStreamTrack): Promise<HTMLCanvasElement | null> {
  const Ctor = (globalThis as { ImageCapture?: new (t: MediaStreamTrack) => { takePhoto: () => Promise<Blob> } })
    .ImageCapture;
  if (!Ctor) return null;
  try {
    // Some devices take a full autofocus/exposure cycle over this, or never
    // settle at all. The preview burst is a perfectly good capture, so a slow
    // shutter is not worth waiting out — the whole complaint being addressed
    // here is how long a reading takes.
    const blob = await Promise.race([
      new Ctor(track).takePhoto(),
      new Promise<null>((resolve) => setTimeout(() => resolve(null), STILL_TIMEOUT_MS)),
    ]);
    if (!blob) return null;
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement("canvas");
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
    bitmap.close();
    // A still that came back smaller than the preview is no use — some devices
    // answer takePhoto() from the preview pipeline.
    return canvas.width >= 640 ? canvas : null;
  } catch {
    return null;
  }
}

/**
 * A JPEG data URL of a capture, bounded in size.
 *
 * The canvas handed to the OCR is now whatever the camera's photo pipeline
 * produced, which can be 12 MP. Encoding that straight to a data URL yields
 * several megabytes of base64 that is then held in session state and uploaded
 * as the odometer photo — so the stored copy is scaled down first. This is
 * evidence for a human looking at a disputed reading, not something the models
 * ever see again.
 */
export function toStoredJpeg(canvas: HTMLCanvasElement, maxEdge = 1600, quality = 0.9): string {
  const longest = Math.max(canvas.width, canvas.height);
  if (longest <= maxEdge) return canvas.toDataURL("image/jpeg", quality);
  const scale = maxEdge / longest;
  const out = document.createElement("canvas");
  out.width = Math.round(canvas.width * scale);
  out.height = Math.round(canvas.height * scale);
  const ctx = out.getContext("2d");
  if (!ctx) return canvas.toDataURL("image/jpeg", quality);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(canvas, 0, 0, out.width, out.height);
  return out.toDataURL("image/jpeg", quality);
}

/**
 * The CSS transform that makes a region of the video fill its container.
 *
 * The camera's own zoom magnifies about the sensor centre, so zooming in on an
 * odometer sitting bottom-right of the cluster pushes it out of frame
 * entirely. Transforming the preview instead magnifies wherever the digits
 * actually are. The capture still crops from the full-resolution frame, so
 * this only changes what the operator sees, never what the reader is given.
 *
 * `region` is in the video's own pixels. Returns the `transform` and
 * `transformOrigin` for the <video>, or null when there is nothing to do.
 */
export function regionZoomTransform(
  video: HTMLVideoElement,
  region: { x: number; y: number; width: number; height: number },
  maxScale = 6,
): { transform: string; transformOrigin: string } | null {
  const boxW = video.clientWidth;
  const boxH = video.clientHeight;
  const { videoWidth: vw, videoHeight: vh } = video;
  if (!boxW || !boxH || !vw || !vh || region.width < 1 || region.height < 1) return null;

  // object-fit: cover — the same mapping mapOverlayToVideoRect inverts.
  const cover = Math.max(boxW / vw, boxH / vh);
  const offsetX = (vw * cover - boxW) / 2;
  const offsetY = (vh * cover - boxH) / 2;

  // How much further to magnify so the region fills the container, with a
  // little margin so the digits are not flush against the edges.
  const scale = Math.min(maxScale, Math.max(1, Math.min(boxW / (region.width * cover), boxH / (region.height * cover)) * 0.85));

  const centreX = (region.x + region.width / 2) * cover - offsetX;
  const centreY = (region.y + region.height / 2) * cover - offsetY;
  const tx = boxW / 2 - centreX * scale;
  const ty = boxH / 2 - centreY * scale;

  return { transform: `translate(${tx}px, ${ty}px) scale(${scale})`, transformOrigin: "0 0" };
}
