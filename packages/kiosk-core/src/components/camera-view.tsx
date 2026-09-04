import { useEffect, useRef, useState } from "react";

interface CameraViewProps {
  onCapture: (canvas: HTMLCanvasElement, dataUrl: string) => void;
  /** "frame" = dashed corner brackets for scanning a card/QR; "photo" = plain rounded viewfinder. */
  variant?: "frame" | "photo";
  hint?: string;
}

export function CameraView({ onCapture, variant = "photo", hint }: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function start() {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });
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
