/**
 * Pure image-cropping helper — used by the <ImageCropper /> UI but kept
 * dependency-free (no React) so it is trivially unit-testable in Vitest.
 *
 * Contract:
 *   - `imageSrc` is any URL the browser can decode via <img>: data URL,
 *     object URL, blob URL, or remote URL (must respect the page's CORS
 *     policy when used with a tainted canvas).
 *   - The crop rectangle is expressed in **source pixels** (the natural
 *     image size, after rotation). Browsers auto-apply EXIF orientation
 *     when an HTMLImageElement is drawn to a canvas, so the input image
 *     is rendered already-corrected. The resulting Blob has no EXIF
 *     segment (canvas re-encode strips it — good for PROJECT_PLAN §10
 *     privacy: GPS data cannot leak).
 *   - The function returns a Blob of type `outputType` (default JPEG 92%
 *     quality — good balance for retro photos, well within the R2 free
 *     tier envelope targeted by PROJECT_PLAN §12).
 *
 * This module is **client-only** (uses Canvas + Blob). Server components
 * must never import it.
 */

export interface CropRect {
  /** X (px in source pixels) */
  x: number;
  /** Y (px in source pixels) */
  y: number;
  /** Width (px) */
  width: number;
  /** Height (px) */
  height: number;
}

export interface CropOptions {
  /** Image source URL (data URL, object URL, etc.) */
  imageSrc: string;
  /** Crop rectangle in **source pixels** */
  crop: CropRect;
  /** Rotation in degrees (clockwise) */
  rotation?: number;
  /** Mirror flip */
  flipHorizontal?: boolean;
  /** Output MIME type — defaults to JPEG */
  outputType?: string;
  /** Output quality 0..1 — defaults to 0.92 */
  outputQuality?: number;
}

/**
 * Loads the source image into an HTMLImageElement. Resolves once the
 * browser has decoded the bitmap.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    // Allow the browser to use the image as a canvas source even when
    // fetched cross-origin (R2 public assets already send the right CORS
    // headers, but data URLs don't need it).
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Impossible de charger l'image (${src.slice(0, 40)}…)`));
    img.src = src;
  });
}

/**
 * Produces the cropped + rotated image as a Blob. The crop rectangle is
 * expressed in **source pixels** (the post-rotation coordinate space).
 *
 * Algorithm:
 *   1. Draw the image into an offscreen canvas, applying rotation +
 *      optional horizontal flip.
 *   2. Read the requested pixel rectangle with `getImageData`.
 *   3. Encode to the requested output type at the requested quality.
 *
 * @returns A `Blob` (and the natural dimensions used) suitable for upload
 *          or further compression via `browser-image-compression`.
 */
export async function getCroppedBlob({
  imageSrc,
  crop,
  rotation = 0,
  flipHorizontal = false,
  outputType = "image/jpeg",
  outputQuality = 0.92,
}: CropOptions): Promise<{ blob: Blob; width: number; height: number }> {
  const image = await loadImage(imageSrc);

  // Canvas big enough to hold the rotated image without clipping.
  const rotatedWidth = rotation % 180 === 0 ? image.naturalWidth : image.naturalHeight;
  const rotatedHeight = rotation % 180 === 0 ? image.naturalHeight : image.naturalWidth;

  const canvas = document.createElement("canvas");
  canvas.width = rotatedWidth;
  canvas.height = rotatedHeight;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Contexte canvas indisponible.");
  }

  // Translate, rotate, (optional) flip, then draw at origin.
  ctx.translate(rotatedWidth / 2, rotatedHeight / 2);
  ctx.rotate((rotation * Math.PI) / 180);
  if (flipHorizontal) ctx.scale(-1, 1);
  ctx.drawImage(image, -image.naturalWidth / 2, -image.naturalHeight / 2);

  // Read just the crop rectangle.
  const safeX = Math.max(0, Math.min(rotatedWidth, Math.round(crop.x)));
  const safeY = Math.max(0, Math.min(rotatedHeight, Math.round(crop.y)));
  // Use the clamped coordinates (safeX/safeY) — not the raw crop.x/y —
  // when computing the available width/height. The raw value would
  // inflate the bound whenever crop.x is negative.
  const safeCrop: CropRect = {
    x: safeX,
    y: safeY,
    width: Math.max(1, Math.min(rotatedWidth - safeX, Math.round(crop.width))),
    height: Math.max(1, Math.min(rotatedHeight - safeY, Math.round(crop.height))),
  };

  // Round-up to even dimensions — some encoders (e.g. libjpeg-turbo)
  // refuse odd widths/heights and silently produce a black strip.
  const outWidth = safeCrop.width + (safeCrop.width % 2);
  const outHeight = safeCrop.height + (safeCrop.height % 2);

  const out = document.createElement("canvas");
  out.width = outWidth;
  out.height = outHeight;
  const outCtx = out.getContext("2d");
  if (!outCtx) {
    throw new Error("Contexte canvas (sortie) indisponible.");
  }
  outCtx.drawImage(
    canvas,
    safeCrop.x,
    safeCrop.y,
    safeCrop.width,
    safeCrop.height,
    0,
    0,
    outWidth,
    outHeight,
  );

  const blob = await new Promise<Blob>((resolve, reject) => {
    out.toBlob(
      (b) => {
        if (b) resolve(b);
        else reject(new Error(`Échec encodage (${outputType} q=${outputQuality}).`));
      },
      outputType,
      outputQuality,
    );
  });

  return { blob, width: outWidth, height: outHeight };
}

/**
 * Reasonable upper bound for "well-compressed" retro photos. Anything
 * larger is almost certainly user error (raw 24-MP phone shot). 50 MB
 * is generous and avoids silent memory blow-ups.
 */
export const MAX_INPUT_BYTES = 50 * 1024 * 1024;

/**
 * True for image MIMEs that can be safely re-encoded by a canvas without
 * losing semantic content. We exclude `image/gif` (canvas re-encoding
 * destroys animation) and SVG (vector — has no raster pixels to crop).
 */
const CROPABLE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/bmp"]);

export function isCropableImage(file: File): boolean {
  return CROPABLE_TYPES.has(file.type);
}
