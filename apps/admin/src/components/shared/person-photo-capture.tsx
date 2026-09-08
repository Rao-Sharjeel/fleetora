import { useRef, useState } from "react";
import Cropper, { type Area } from "react-easy-crop";
import { Camera, RefreshCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { getCroppedImageFile } from "@/lib/crop-image";
import { cn } from "@/lib/utils";

interface PersonPhotoCaptureProps {
  label: string;
  required?: boolean;
  onCapture?: (file: File) => void;
  className?: string;
  /** Shows an existing photo (e.g. a record's current photoUrl) before anything
   * new is captured — used when editing a record that already has a photo. */
  initialPreviewUrl?: string;
}

/**
 * Person-photo capture for Drivers/Guards — always a square crop, unlike the
 * plain PhotoCapture used for vehicle/odometer/receipt evidence shots. Picking
 * or capturing a file opens an interactive square crop dialog (pan + zoom)
 * before the photo is accepted, so every stored photo is guaranteed square
 * regardless of what aspect ratio the source image was.
 */
export function PersonPhotoCapture({ label, required, onCapture, className, initialPreviewUrl }: PersonPhotoCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(initialPreviewUrl ?? null);
  const [rawImage, setRawImage] = useState<string | null>(null);
  const [cropperOpen, setCropperOpen] = useState(false);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setRawImage(URL.createObjectURL(file));
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCropperOpen(true);
    // Allow re-picking the exact same file later (e.g. after Cancel).
    e.target.value = "";
  }

  async function confirmCrop() {
    if (!rawImage || !croppedAreaPixels) return;
    setSaving(true);
    try {
      const croppedFile = await getCroppedImageFile(rawImage, croppedAreaPixels);
      setPreview(URL.createObjectURL(croppedFile));
      onCapture?.(croppedFile);
      setCropperOpen(false);
    } finally {
      setSaving(false);
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
      {preview ? (
        <div className="relative aspect-square w-40 overflow-hidden rounded-lg border border-border">
          <img src={preview} alt={label} className="h-full w-full object-cover" />
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
          className="flex aspect-square w-40 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
        >
          <Camera className="h-7 w-7" />
          <span className="text-center text-sm font-medium">Tap to capture photo</span>
        </button>
      )}

      <Dialog open={cropperOpen} onOpenChange={setCropperOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Crop Photo</DialogTitle>
          </DialogHeader>
          <div className="relative h-80 w-full overflow-hidden rounded-lg bg-black">
            {rawImage && (
              <Cropper
                image={rawImage}
                crop={crop}
                zoom={zoom}
                aspect={1}
                cropShape="rect"
                showGrid
                onCropChange={setCrop}
                onZoomChange={setZoom}
                onCropComplete={(_area, pixels) => setCroppedAreaPixels(pixels)}
              />
            )}
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Zoom</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className="h-2 w-full cursor-pointer accent-primary"
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropperOpen(false)}>
              Cancel
            </Button>
            <Button type="button" onClick={confirmCrop} disabled={saving || !croppedAreaPixels}>
              {saving ? "Saving…" : "Use Photo"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
