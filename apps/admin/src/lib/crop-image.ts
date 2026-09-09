import type { Area } from "react-easy-crop";

// These are ID-badge photos — a 36px table avatar and a ~192px profile photo
// are the largest current uses (plus a small print card). Capping output here
// means one stored file works for every size we actually render, instead of
// uploading a phone camera's full 3000px+ resolution (several MB) just to
// shrink it back down in CSS every time it's displayed.
const MAX_OUTPUT_SIZE = 480;

// Non-cropped captures (vehicle photos, odometer/receipt evidence shots) keep
// more resolution than a badge photo — an odometer reading has to stay legible
// — but a phone's full-size original is still far more than anything renders.
const MAX_PHOTO_EDGE = 1280;

/** Mirrors common.serializers.Base64ImageField.ALLOWED_FORMATS — the backend
 * rejects anything else, so the picker shouldn't offer it. */
export const ACCEPTED_IMAGE_TYPES = "image/jpeg,image/png";

const ACCEPTED_MIME = new Set(["image/jpeg", "image/jpg", "image/png"]);

/**
 * Filters a picked file list down to the formats the API accepts, returning
 * what was rejected so the caller can say so. `accept` on the input is only a
 * hint — a file can still arrive through "All Files" or a drag-and-drop.
 */
export function partitionAcceptedImages(files: File[]): { accepted: File[]; rejected: File[] } {
  const accepted: File[] = [];
  const rejected: File[] = [];
  for (const file of files) {
    (ACCEPTED_MIME.has(file.type.toLowerCase()) ? accepted : rejected).push(file);
  }
  return { accepted, rejected };
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
  });
}

function canvasToJpegFile(canvas: HTMLCanvasElement, fileName: string, quality: number): Promise<File> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export image."));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      quality,
    );
  });
}

/** Rasterizes the region of `imageSrc` selected by react-easy-crop's
 * onCropComplete pixel area into a standalone square-cropped File, downscaled
 * to MAX_OUTPUT_SIZE if the source crop is larger (never upscaled). */
export async function getCroppedImageFile(
  imageSrc: string,
  cropPixels: Area,
  fileName = "photo.jpg",
): Promise<File> {
  const image = await loadImage(imageSrc);
  const outputSize = Math.min(cropPixels.width, cropPixels.height, MAX_OUTPUT_SIZE);
  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Could not get canvas context");

  ctx.drawImage(
    image,
    cropPixels.x,
    cropPixels.y,
    cropPixels.width,
    cropPixels.height,
    0,
    0,
    outputSize,
    outputSize,
  );

  return canvasToJpegFile(canvas, fileName, 0.92);
}

/** Downscales `file` so its longest edge is at most `maxEdge`, preserving aspect
 * ratio. Returns the original file untouched when it's already small enough (no
 * pointless re-encode) or when the browser can't decode it (e.g. HEIC in Chrome)
 * — uploading the original is no worse than today, and the backend validates it. */
export async function resizeImageFile(file: File, maxEdge = MAX_PHOTO_EDGE): Promise<File> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.naturalWidth, image.naturalHeight));
    if (scale === 1) return file;

    const width = Math.round(image.naturalWidth * scale);
    const height = Math.round(image.naturalHeight * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;

    ctx.drawImage(image, 0, 0, width, height);
    return await canvasToJpegFile(canvas, file.name, 0.85);
  } catch {
    return file;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
