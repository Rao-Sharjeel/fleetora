import { useEffect, useRef, useState } from "react";
import { decodeQr } from "../lib/barcode";

interface CameraViewProps {
  onCapture: (canvas: HTMLCanvasElement, dataUrl: string) => void;
  /** "frame" = dashed corner brackets for scanning a card/QR; "photo" = plain rounded viewfinder. */
  variant?: "frame" | "photo";
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

export function CameraView({ onCapture, variant = "photo", hint, onDetectQr }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

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

  function capture() {
    const video = videoRef.current;
    if (!video || video.videoWidth === 0) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    onCapture(canvas, canvas.toDataURL("image/jpeg", 0.85));
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
        <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
        {variant === "frame" && (
          <div className="pointer-events-none absolute inset-8 rounded-xl border-2 border-dashed border-kiosk-accent/80" />
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
        className="mx-auto h-16 w-16 shrink-0 rounded-full border-4 border-kiosk-border bg-white active:scale-95"
      />
    </div>
  );
}
