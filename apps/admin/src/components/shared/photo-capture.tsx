import { useRef, useState } from "react";
import { Camera, Loader2, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { resizeImageFile } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  onCapture?: (file: File) => void;
  className?: string;
  /** Shows an existing photo (e.g. a record's current photoUrl) before anything
   * new is captured — used when editing a record that already has a photo. */
  initialPreviewUrl?: string;
}

/**
 * Camera-first evidence capture (odometer / vehicle QR / driver ID / receipts).
 * `capture="environment"` opens the device camera directly on mobile instead of
 * the photo gallery, matching the spec's "prefer direct camera capture" rule.
 */
export function PhotoCapture({ label, required, onCapture, className, initialPreviewUrl }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreviewUrl ?? null);
  const [processing, setProcessing] = useState(false);

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    // Allow re-picking the exact same file (a Retake that lands on the same shot).
    e.target.value = "";
    // Downscaled before it ever reaches the form — a phone original is several
    // MB, which is what made saving a record with a photo feel slow. Decoding
    // and redrawing a big photo takes a visible moment on a phone, so the tile
    // reports it rather than sitting there looking like nothing happened.
    setProcessing(true);
    try {
      const resized = await resizeImageFile(file);
      setPreview(URL.createObjectURL(resized));
      onCapture?.(resized);
    } finally {
      setProcessing(false);
    }
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <span className="text-sm font-medium">
        {label} {required && <span className="text-destructive">*</span>}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={handleChange}
      />
      {processing ? (
        <div className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 text-muted-foreground">
          <Loader2 className="h-7 w-7 animate-spin" />
          <span className="text-sm font-medium">Processing photo…</span>
        </div>
      ) : preview ? (
        <div className="relative overflow-hidden rounded-lg border border-border">
          <img src={preview} alt={label} className="h-40 w-full object-cover" />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="absolute bottom-2 right-2"
            onClick={() => inputRef.current?.click()}
          >
            <RefreshCcw className="h-4 w-4" /> Retake
          </Button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          className="flex h-40 w-full flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
        >
          <Camera className="h-7 w-7" />
          <span className="text-sm font-medium">Tap to capture photo</span>
        </button>
      )}
    </div>
  );
}
