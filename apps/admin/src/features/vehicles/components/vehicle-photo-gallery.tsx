import { useState } from "react";
import { ChevronLeft, ChevronRight, ImageOff } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import type { VehiclePhoto } from "@/types";

interface VehiclePhotoGalleryProps {
  photos: VehiclePhoto[];
  alt: string;
}

/**
 * The vehicle's photos on its Overview tab. Vehicle photos are any aspect
 * ratio, so nothing here is cropped to a square — tiles letterbox with
 * `object-contain` and the lightbox shows the full frame.
 */
export function VehiclePhotoGallery({ photos, alt }: VehiclePhotoGalleryProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (photos.length === 0) {
    return (
      <div className="flex h-48 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/40 text-muted-foreground lg:w-80">
        <ImageOff className="h-7 w-7" />
        <span className="text-sm">No photos yet</span>
      </div>
    );
  }

  const open = lightboxIndex !== null;
  function step(delta: number) {
    setLightboxIndex((i) => (i === null ? i : (i + delta + photos.length) % photos.length));
  }

  return (
    <>
      <div className="flex w-full shrink-0 flex-col gap-2 lg:w-80">
        {/* The first photo leads at full width; the rest sit under it as a
            strip, so a vehicle with one photo still looks deliberate. */}
        <button
          type="button"
          onClick={() => setLightboxIndex(0)}
          className="overflow-hidden rounded-xl border border-border bg-muted transition-opacity hover:opacity-90"
        >
          <img src={photos[0].url} alt={`${alt} photo 1`} className="h-48 w-full object-contain" />
        </button>

        {photos.length > 1 && (
          <div className="grid grid-cols-4 gap-2">
            {photos.slice(1).map((photo, i) => (
              <button
                key={photo.id}
                type="button"
                onClick={() => setLightboxIndex(i + 1)}
                className="overflow-hidden rounded-lg border border-border bg-muted transition-opacity hover:opacity-90"
              >
                <img
                  src={photo.url}
                  alt={`${alt} photo ${i + 2}`}
                  className="aspect-square w-full object-contain"
                />
              </button>
            ))}
          </div>
        )}
      </div>

      <Dialog open={open} onOpenChange={(next) => !next && setLightboxIndex(null)}>
        <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none">
          <DialogTitle className="sr-only">
            {alt} photo {(lightboxIndex ?? 0) + 1} of {photos.length}
          </DialogTitle>
          {open && (
            <div className="relative">
              <img
                src={photos[lightboxIndex].url}
                alt={`${alt} photo ${lightboxIndex + 1}`}
                className="max-h-[80vh] w-full rounded-lg object-contain"
              />
              {/* No close button here — DialogContent renders its own. */}
              {photos.length > 1 && (
                <>
                  <button
                    type="button"
                    aria-label="Previous photo"
                    onClick={() => step(-1)}
                    className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground hover:bg-background"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    aria-label="Next photo"
                    onClick={() => step(1)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-background/80 p-2 text-foreground hover:bg-background"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                  <span className="absolute bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-background/80 px-3 py-1 text-xs text-muted-foreground">
                    {lightboxIndex + 1} / {photos.length}
                  </span>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
