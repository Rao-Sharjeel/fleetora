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
