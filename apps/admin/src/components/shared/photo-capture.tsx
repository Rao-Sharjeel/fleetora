import { useRef, useState } from "react";
import { Camera, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface PhotoCaptureProps {
  label: string;
  required?: boolean;
  onCapture?: (file: File) => void;
  className?: string;
}

/**
 * Camera-first evidence capture (odometer / vehicle QR / driver ID / receipts).
 * `capture="environment"` opens the device camera directly on mobile instead of
 * the photo gallery, matching the spec's "prefer direct camera capture" rule.
 */
export function PhotoCapture({ label, required, onCapture, className }: PhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPreview(URL.createObjectURL(file));
    onCapture?.(file);
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
      {preview ? (
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
