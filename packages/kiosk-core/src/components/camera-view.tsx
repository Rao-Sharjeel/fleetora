import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Flashlight, FlashlightOff, Loader2, X, ZoomIn } from "lucide-react";
import { decodeQr } from "../lib/barcode";
import {
  captureSharpestCrop,
  captureStillFrame,
  cropVideoToCanvas,
  mapOverlayToVideoRect,
  regionZoomTransform,
  toStoredJpeg,
} from "../lib/frame-capture";
import { findDigitsNear } from "../lib/odometer-ocr";
import { focusAt, readCapabilities, setTorch, setZoom, type CameraCapabilities } from "../lib/camera-controls";

interface CameraViewProps {
  onCapture: (canvas: HTMLCanvasElement, dataUrl: string) => void;
  /** "frame" = dashed box for scanning a card/QR; "photo" = plain rounded
   * viewfinder; "odometer" = full-cluster capture for the OCR to search. */
  variant?: "frame" | "photo" | "odometer";
  hint?: string;
  /**
   * When set, polls the live video feed for a QR code instead of waiting for a
   * manual capture tap — a phone's camera app scans continuously until the code
   * locks in, and a single frame grabbed at the moment of a tap misses far more
   * often (autofocus mid-hunt, motion blur, code not quite in frame yet). The
   * capture button still works as a manual fallback.
   */
  onDetectQr?: (value: string) => void;
}

/** How often (ms) to sample a frame from the live video while onDetectQr is
 * active. Frequent enough to feel instant, spaced out enough to not pin a
 * kiosk tablet's CPU running full-frame QR decode every tick. */
const QR_SCAN_INTERVAL_MS = 300;

/**
 * Low-res default streams (some Android WebViews land on ~640x480) make both
 * the QR decoder and the odometer OCR miss far more often than a phone's own
 * camera app, which always requests a high-res stream — so ask for one too.
 * `focusMode` isn't in TS's DOM lib (non-standard, but widely supported on
 * Android Chrome and silently ignored where it isn't); cast past that gap
 * rather than widening the whole constraints type.
 */
const CAMERA_CONSTRAINTS: MediaStreamConstraints = {
  video: {
    facingMode: "environment",
    width: { ideal: 1920 },
    height: { ideal: 1080 },
    advanced: [{ focusMode: "continuous" } as MediaTrackConstraintSet],
  },
  audio: false,
};

/** Where a tap-to-focus ring is showing, in element CSS pixels. */
interface FocusPoint {
  left: number;
  top: number;
  key: number;
}

/** A digit region the operator has locked onto, in the video's own pixels. */
interface LockedRegion {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Padding around a locked region when it is cropped for the reader — the
 * detector's boxes hug the glyphs, and a crop that shaves them costs digits. */
const LOCK_PAD_X = 0.06;
const LOCK_PAD_Y = 0.35;

export function CameraView({ onCapture, variant = "photo", hint, onDetectQr }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [capturing, setCapturing] = useState(false);
  const [caps, setCaps] = useState<CameraCapabilities>({ torch: false, zoom: null, tapToFocus: false });
  const [torchOn, setTorchOn] = useState(false);
  const [zoom, setZoomValue] = useState(1);
  const [focusPoint, setFocusPoint] = useState<FocusPoint | null>(null);
  const [locked, setLocked] = useState<LockedRegion | null>(null);
  const [lockZoom, setLockZoom] = useState<{ transform: string; transformOrigin: string } | undefined>();
  const [locking, setLocking] = useState(false);
  const [lockMissed, setLockMissed] = useState(false);

  const track = () => streamRef.current?.getVideoTracks()[0] ?? null;

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia(CAMERA_CONSTRAINTS);
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        // Read after play(): some Android builds report empty capabilities
        // until the track is actually producing frames.
        const videoTrack = stream.getVideoTracks()[0] ?? null;
        const available = readCapabilities(videoTrack);
        if (!cancelled) {
          setCaps(available);
          setZoomValue(available.zoom?.min ?? 1);
          setTorchOn(false);
        }
      } catch {
        if (!cancelled) setError("Camera access is required to continue. Please allow camera access and try again.");
      }
    }

    start();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [attempt]);

  useEffect(() => {
    if (!locked) return;
    const recompute = () => {
      const video = videoRef.current;
      if (video) setLockZoom(regionZoomTransform(video, locked) ?? undefined);
    };
    window.addEventListener("resize", recompute);
    window.addEventListener("orientationchange", recompute);
    return () => {
      window.removeEventListener("resize", recompute);
      window.removeEventListener("orientationchange", recompute);
    };
  }, [locked]);

  useEffect(() => {
    if (!onDetectQr) return;
    let cancelled = false;
    let busy = false;

    const timer = window.setInterval(async () => {
      if (busy || cancelled) return;
      const video = videoRef.current;
      if (!video || video.videoWidth === 0) return;
      busy = true;
      try {
        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const value = await decodeQr(canvas);
        if (value && !cancelled) onDetectQr(value);
      } finally {
        busy = false;
      }
    }, QR_SCAN_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [onDetectQr]);

  /** The region the dashed frame is drawn over, in the video's own pixels.
   * Falls back to the whole frame when there's no frame overlay to measure. */
  const currentCropRect = useCallback(() => {
    const video = videoRef.current!;
    const overlay = overlayRef.current;
    // No measured overlay (QR/photo variants) means capture the full frame,
    // exactly as before — only the odometer band opts into cropping.
    if (!overlay) return { x: 0, y: 0, width: video.videoWidth, height: video.videoHeight };
    const videoBox = video.getBoundingClientRect();
    const overlayBox = overlay.getBoundingClientRect();
    return mapOverlayToVideoRect(video, {
      left: overlayBox.left - videoBox.left,
      top: overlayBox.top - videoBox.top,
      width: overlayBox.width,
      height: overlayBox.height,
    });
  }, []);

  function stopStream() {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  }

  async function toggleTorch() {
    const videoTrack = track();
    if (!videoTrack) return;
    const next = !torchOn;
    if (await setTorch(videoTrack, next)) setTorchOn(next);
  }

  function onZoomChange(next: number) {
    setZoomValue(next);
    const videoTrack = track();
    if (videoTrack) void setZoom(videoTrack, next);
  }

  /**
   * Tap the preview: refocus there, and on the odometer screen, lock onto the
   * digits under the tap.
   *
   * The detector is what fails on a hard cluster — glare, an unusual layout,
   * digits already filling the frame. The operator can always see the
   * odometer, so letting them point at it turns the pipeline's weakest step
   * into a gesture.
   */
  async function handlePreviewTap(event: React.MouseEvent<HTMLDivElement>) {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const box = video.getBoundingClientRect();
    const left = event.clientX - box.left;
    const top = event.clientY - box.top;
    setFocusPoint({ left, top, key: Date.now() });

    // pointsOfInterest is in frame coordinates, and the preview is drawn with
    // object-fit: cover — so the tap has to be mapped the same way a crop is,
    // or the camera focuses on the wrong part of the scene.
    const point = mapOverlayToVideoRect(video, { left, top, width: 1, height: 1 });
    const videoTrack = track();
    if (videoTrack && caps.tapToFocus) {
      void focusAt(videoTrack, point.x / video.videoWidth, point.y / video.videoHeight);
    }

    if (variant !== "odometer" || locking) return;
    setLocking(true);
    setLockMissed(false);
    try {
      const frame = cropVideoToCanvas(video, {
        x: 0,
        y: 0,
        width: video.videoWidth,
        height: video.videoHeight,
      });
      const found = await findDigitsNear(frame, point.x / video.videoWidth, point.y / video.videoHeight);
      if (found) {
        const region = {
          x: found.x1,
          y: found.y1,
          width: found.x2 - found.x1,
          height: found.y2 - found.y1,
        };
        setLocked(region);
        setLockZoom(regionZoomTransform(video, region) ?? undefined);
      } else {
        // Leave any existing lock alone rather than dropping it on a stray tap.
        setLockMissed(true);
      }
    } catch {
      setLockMissed(true);
    } finally {
      setLocking(false);
    }
  }

  function clearLock() {
    setLocked(null);
    setLockZoom(undefined);
    setLockMissed(false);
  }

  async function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0 || capturing) return;
    setCapturing(true);
    try {
      const videoTrack = track();
      // A full-resolution still first — several times the pixels on the digits,
      // which is what the recogniser is short of. Only for the odometer: the QR
      // path reads the live preview and a shutter round-trip would slow it
      // down for no gain.
      let canvas: HTMLCanvasElement | null = null;
      if (variant === "odometer" && videoTrack) {
        canvas = await captureStillFrame(videoTrack);
      }
      if (!canvas) canvas = await captureSharpestCrop(video, currentCropRect);

      // A locked region is in preview-frame pixels; a full-resolution still is
      // larger, so scale before cropping or the crop lands somewhere else.
      if (canvas && locked && video.videoWidth) {
        const ratio = canvas.width / video.videoWidth;
        const padX = locked.width * LOCK_PAD_X;
        const padY = locked.height * LOCK_PAD_Y;
        const x = Math.max(0, (locked.x - padX) * ratio);
        const y = Math.max(0, (locked.y - padY) * ratio);
        const width = Math.min(canvas.width - x, (locked.width + padX * 2) * ratio);
        const height = Math.min(canvas.height - y, (locked.height + padY * 2) * ratio);
        if (width >= 16 && height >= 8) {
          const cropped = document.createElement("canvas");
          cropped.width = Math.round(width);
          cropped.height = Math.round(height);
          cropped
            .getContext("2d")
            ?.drawImage(canvas, x, y, width, height, 0, 0, cropped.width, cropped.height);
          canvas = cropped;
        }
      }
      // Release the camera the moment the frames are in hand. What follows —
      // OCR — can take seconds, and leaving the stream live keeps the camera
      // indicator on and the preview moving as though nothing was captured.
      stopStream();
      if (!canvas) return;
      // Full canvas to the OCR, a bounded copy for storage and upload.
      onCapture(canvas, toStoredJpeg(canvas));
    } finally {
      setCapturing(false);
    }
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 rounded-2xl border border-kiosk-border bg-kiosk-panel p-6 text-center">
        <p className="text-sm text-kiosk-muted">{error}</p>
        <button
          type="button"
          onClick={() => setAttempt((n) => n + 1)}
          className="rounded-xl bg-kiosk-accent px-5 py-2.5 text-sm font-semibold text-white active:scale-95"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4">
      <div className="relative min-h-0 flex-1 overflow-hidden rounded-2xl bg-black">
        {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
        <div className="absolute inset-0 overflow-hidden" onClick={handlePreviewTap}>
          <video
            ref={videoRef}
            playsInline
            muted
            className="h-full w-full object-cover transition-transform duration-300"
            style={lockZoom ?? undefined}
          />
        </div>

        {variant === "frame" && (
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-dashed border-kiosk-accent/80" />
        )}
        {variant === "odometer" && !locked && (
          // No crop box by default: the reader finds the digits itself,
          // wherever they sit. A fixed band had to be aimed, and on real
          // dashboards the odometer turned up bottom-right, mid-left and dead
          // centre. This outline is guidance only; nothing is cropped to it
          // unless the operator taps to lock on.
          <div className="pointer-events-none absolute inset-4 rounded-xl border border-dashed border-kiosk-accent/40" />
        )}

        {variant === "odometer" && locked && (
          <div className="pointer-events-none absolute inset-x-0 top-3 flex justify-center">
            <span className="flex items-center gap-1.5 rounded-full bg-kiosk-accent/90 px-3 py-1 text-xs font-medium text-white">
              <Crosshair className="h-3.5 w-3.5" /> Locked on these digits
            </span>
          </div>
        )}

        {variant === "odometer" && locked && (
          <button
            type="button"
            onClick={clearLock}
            aria-label="Clear the locked region"
            className="absolute left-3 top-3 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        )}

        {locking && (
          <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center">
            <span className="flex items-center gap-2 rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Finding the digits…
            </span>
          </div>
        )}

        {lockMissed && !locking && (
          <div className="pointer-events-none absolute inset-x-0 top-14 flex justify-center">
            <span className="rounded-full bg-black/70 px-3 py-1 text-xs text-white">
              No digits found there — tap directly on them.
            </span>
          </div>
        )}

        {focusPoint && (
          <span
            key={focusPoint.key}
            className="pointer-events-none absolute h-16 w-16 -translate-x-1/2 -translate-y-1/2 animate-ping rounded-full border-2 border-kiosk-accent"
            style={{ left: focusPoint.left, top: focusPoint.top, animationIterationCount: 1 }}
            onAnimationEnd={() => setFocusPoint(null)}
          />
        )}

        {caps.torch && (
          <button
            type="button"
            onClick={toggleTorch}
            aria-label={torchOn ? "Turn flashlight off" : "Turn flashlight on"}
            aria-pressed={torchOn}
            className={`absolute right-3 top-3 flex h-12 w-12 items-center justify-center rounded-full backdrop-blur active:scale-95 ${
              torchOn ? "bg-kiosk-accent text-white" : "bg-black/60 text-white"
            }`}
          >
            {torchOn ? <Flashlight className="h-5 w-5" /> : <FlashlightOff className="h-5 w-5" />}
          </button>
        )}

        {caps.zoom && (
          <div className="absolute inset-x-4 bottom-12 flex items-center gap-3 rounded-full bg-black/60 px-4 py-2 backdrop-blur">
            <ZoomIn className="h-4 w-4 shrink-0 text-white" />
            <input
              type="range"
              aria-label="Zoom"
              min={caps.zoom.min}
              max={caps.zoom.max}
              step={caps.zoom.step}
              value={zoom}
              onChange={(e) => onZoomChange(Number(e.target.value))}
              className="h-6 w-full accent-kiosk-accent"
            />
            <span className="w-10 shrink-0 text-right text-xs text-white">{zoom.toFixed(1)}×</span>
          </div>
        )}

        {capturing && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/70">
            <Loader2 className="h-8 w-8 animate-spin text-kiosk-accent" />
            <span className="text-sm text-white">Capturing…</span>
          </div>
        )}
        {hint && (
          <div className="absolute inset-x-0 bottom-3 flex justify-center">
            <span className="rounded-full bg-black/60 px-3 py-1 text-xs text-white">{hint}</span>
          </div>
        )}
      </div>
      <button
        type="button"
        onClick={capture}
        aria-label="Capture"
        disabled={capturing}
        className="mx-auto h-16 w-16 shrink-0 rounded-full border-4 border-kiosk-border bg-white active:scale-95 disabled:opacity-60"
      />
    </div>
  );
}
