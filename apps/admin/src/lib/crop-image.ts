import type { Area } from "react-easy-crop";

// These are ID-badge photos — a 36px table avatar and a ~192px profile photo
// are the largest current uses (plus a small print card). Capping output here
// means one stored file works for every size we actually render, instead of
// uploading a phone camera's full 3000px+ resolution (several MB) just to
// shrink it back down in CSS every time it's displayed.
const MAX_OUTPUT_SIZE = 480;

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", reject);
    image.src = url;
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

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          reject(new Error("Failed to export cropped image."));
          return;
        }
        resolve(new File([blob], fileName, { type: "image/jpeg" }));
      },
      "image/jpeg",
      0.92,
    );
  });
}
