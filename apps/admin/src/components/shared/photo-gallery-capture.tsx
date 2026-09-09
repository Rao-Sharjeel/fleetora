import { useRef, useState } from "react";
import { Camera, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { resizeImageFile } from "@/lib/crop-image";
import { fileToDataUrl } from "@/lib/utils";
import { cn } from "@/lib/utils";

/** One slot in the gallery: either a photo already on the record (referenced by
 * id) or a freshly captured one (carried as a base64 data URL). The form sends
 * this list straight to the API, which reads it the same way. */
export type GalleryEntry = { kind: "existing"; id: string; url: string } | { kind: "new"; dataUrl: string };

interface PhotoGalleryCaptureProps {
  label: string;
  value: GalleryEntry[];
  onChange: (next: GalleryEntry[]) => void;
  max: number;
  className?: string;
}

/**
 * Multi-photo capture for vehicles. Unlike PersonPhotoCapture there is no crop
 * step — a vehicle gets photographed from whatever angle and aspect ratio the
 * camera gives, and the gallery shows each image as-is.
 */
export function PhotoGalleryCapture({ label, value, onChange, max, className }: PhotoGalleryCaptureProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [processing, setProcessing] = useState(0);

  const remaining = max - value.length;

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = Array.from(e.target.files ?? []);
    e.target.value = ""; // allow re-picking the same file
    if (!picked.length) return;

    // Silently dropping the rest of a larger selection would look like a bug.
    const accepted = picked.slice(0, remaining);
    if (picked.length > accepted.length) {
      toast.warning(`Only ${accepted.length} of ${picked.length} photos added — the limit is ${max}.`);
    }
    setProcessing(accepted.length);
    try {
      const added: GalleryEntry[] = [];
      for (const file of accepted) {
        const resized = await resizeImageFile(file);
        added.push({ kind: "new", dataUrl: await fileToDataUrl(resized) });
      }
      onChange([...value, ...added]);
    } finally {
      setProcessing(0);
    }
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground">
          {value.length} of {max}
        </span>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleChange}
      />
      <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {value.map((entry, index) => (
          <div
            key={entry.kind === "existing" ? entry.id : `new-${index}`}
            className="group relative aspect-[4/3] overflow-hidden rounded-lg border border-border bg-muted"
          >
            {/* contain, not cover: these are any shape, and cropping the
                thumbnail would hide what the photo is actually of. */}
            <img
              src={entry.kind === "existing" ? entry.url : entry.dataUrl}
              alt={`${label} ${index + 1}`}
              className="h-full w-full object-contain"
            />
            <button
              type="button"
              aria-label={`Remove photo ${index + 1}`}
              onClick={() => removeAt(index)}
              className="absolute right-1 top-1 rounded-full bg-background/80 p-1 text-muted-foreground opacity-0 transition-opacity hover:text-destructive focus-visible:opacity-100 group-hover:opacity-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            {index === 0 && (
              <span className="absolute bottom-1 left-1 rounded bg-background/80 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
                Main
              </span>
            )}
          </div>
        ))}

        {Array.from({ length: processing }).map((_, i) => (
          <div
            key={`processing-${i}`}
            className="flex aspect-[4/3] items-center justify-center rounded-lg border border-dashed border-input bg-muted/40"
          >
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ))}

        {remaining > 0 && processing === 0 && (
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="flex aspect-[4/3] flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-input bg-muted/40 text-muted-foreground transition-colors hover:bg-muted"
          >
            <Camera className="h-5 w-5" />
            <span className="text-xs font-medium">Add</span>
          </button>
        )}
      </div>
      {remaining === 0 && (
        <p className="text-xs text-muted-foreground">
          Maximum of {max} photos reached — remove one to add another.
        </p>
      )}
    </div>
  );
}

/** The wire format the API expects: existing photos as their id, new ones as a
 * base64 data URL, in gallery order. */
export function galleryToPayload(entries: GalleryEntry[]): string[] {
  return entries.map((e) => (e.kind === "existing" ? e.id : e.dataUrl));
}

/** Seeds the editor from a record's saved photos. */
export function photosToGallery(photos: { id: string; url: string }[] | undefined): GalleryEntry[] {
  return (photos ?? []).map((p) => ({ kind: "existing", id: p.id, url: p.url }));
}
