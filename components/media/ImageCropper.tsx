"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Cropper, { Area } from "react-easy-crop";
import { getCroppedBlob, type CropRect } from "@/lib/imageCrop";

/**
 * Skyblog-styled image cropper modal.
 *
 * Wraps the headless `<Cropper />` from `react-easy-crop` with:
 *   - retro neon aesthetic (matches the rest of the editor toolbar),
 *   - touch-first controls (pinch-zoom, drag-pan are already in Cropper),
 *   - aspect-ratio presets (`Libre`, `1:1`, `4:3`, `16:9`) for quick picking,
 *   - rotation slider,
 *   - "Recadrer" / "Passer" / "Annuler" actions in French.
 *
 * The component is fully controlled — it does NOT touch the parent's
 * upload pipeline. On confirm it hands back a `Blob` of the cropped image
 * via `onConfirm`. On cancel it invokes `onCancel` and discards the file.
 */

export interface ImageCropperProps {
  /** Source URL of the image (object URL works great for File previews). */
  imageSrc: string;
  /** Original filename — used to derive the cropped Blob's filename. */
  fileName: string;
  /** Original MIME — used to choose the output encoding. */
  fileType: string;
  /** Optional initial aspect ratio (width / height). `undefined` = free. */
  aspect?: number;
  /** Callback with the cropped Blob + a sensible filename. */
  onConfirm: (blob: Blob, fileName: string) => void;
  /** Callback when the user dismisses the modal without cropping. */
  onCancel: () => void;
}

interface AspectPreset {
  label: string;
  value: number | undefined;
}

const ASPECT_PRESETS: AspectPreset[] = [
  { label: "Libre", value: undefined },
  { label: "1:1", value: 1 },
  { label: "4:3", value: 4 / 3 },
  { label: "16:9", value: 16 / 9 },
];

export default function ImageCropper({
  imageSrc,
  fileName,
  fileType,
  aspect,
  onConfirm,
  onCancel,
}: ImageCropperProps) {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);
  const [currentAspect, setCurrentAspect] = useState<number | undefined>(aspect);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Keep the latest `onCancel` in a ref so the keydown handler below
  // does not need to be re-bound on every render.
  const cancelRef = useRef(onCancel);
  useEffect(() => {
    cancelRef.current = onCancel;
  });

  // Close on Escape (but not while we're busy encoding).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape" && !busy) cancelRef.current();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy]);

  const handleCropComplete = useCallback((_area: Area, areaPx: Area) => {
    setCroppedAreaPixels(areaPx);
  }, []);

  async function handleConfirm() {
    if (!croppedAreaPixels) return;
    setBusy(true);
    setError(null);
    try {
      const outputType = fileType === "image/png" ? "image/png" : "image/jpeg";
      const rect: CropRect = {
        x: croppedAreaPixels.x,
        y: croppedAreaPixels.y,
        width: croppedAreaPixels.width,
        height: croppedAreaPixels.height,
      };
      const { blob } = await getCroppedBlob({
        imageSrc,
        crop: rect,
        rotation,
        outputType,
        outputQuality: 0.92,
      });
      const baseName = fileName.replace(/\.[^.]+$/, "");
      const ext = outputType === "image/png" ? "png" : "jpg";
      onConfirm(blob, `${baseName}.${ext}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recadrage impossible.");
      setBusy(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3"
      role="dialog"
      aria-modal="true"
      aria-label="Recadrer l'image"
      data-testid="image-cropper-modal"
    >
      <div className="retro-panel flex max-h-full w-full max-w-2xl flex-col gap-3 rounded-lg p-3">
        <h2 className="neon-pink text-center text-lg">✂️ Recadrer l&apos;image</h2>

        <div className="relative h-[55vh] min-h-[260px] w-full overflow-hidden rounded-md border-2 border-[var(--sky-hotpink)] bg-black">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            rotation={rotation}
            aspect={currentAspect}
            showGrid={currentAspect !== undefined}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onRotationChange={setRotation}
            onCropComplete={handleCropComplete}
            objectFit="contain"
            style={{
              containerStyle: { backgroundColor: "#000" },
              cropAreaStyle: {
                border: "2px dashed var(--sky-hotpink)",
                color: "rgba(255,105,180,0.6)",
              },
            }}
          />
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs text-white">
          <span className="text-[var(--sky-hotpink)]">Format :</span>
          {ASPECT_PRESETS.map((preset) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => setCurrentAspect(preset.value)}
              // NOTE: deliberately NOT using `.tool-btn` here — that class
              // shrinks the button to ~31 px tall (defined in RetroEditor's
              // <style> block, scoped globally), which is below the 44 px
              // iOS HIG touch target. We also force `min-h-[44px]` because
              // the wrapping `text-xs` would otherwise cascade `font-size:
              // 12px` into the button and pull its height below 44 px.
              className={`retro-btn min-h-[44px]${
                currentAspect === preset.value ? " opacity-90" : ""
              }`}
              disabled={busy}
              data-testid={`aspect-${preset.label.replace(":", "-")}`}
            >
              {preset.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2 text-xs text-white">
          <span className="shrink-0 text-[var(--sky-hotpink)]">Zoom</span>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            disabled={busy}
            className="w-full accent-[var(--sky-hotpink)]"
            aria-label="Zoom"
          />
        </div>

        <div className="flex items-center gap-2 text-xs text-white">
          <span className="shrink-0 text-[var(--sky-hotpink)]">Rotation</span>
          <input
            type="range"
            min={0}
            max={360}
            step={1}
            value={rotation}
            onChange={(e) => setRotation(Number(e.target.value))}
            disabled={busy}
            className="w-full accent-[var(--sky-hotpink)]"
            aria-label="Rotation"
          />
          <button
            type="button"
            onClick={() => setRotation(0)}
            className="retro-btn min-h-[44px]"
            disabled={busy || rotation === 0}
            aria-label="Remettre la rotation à zéro"
            title="Remettre à zéro"
          >
            0°
          </button>
        </div>

        {error && <p className="text-center text-xs text-[#ff8080]">{error}</p>}

        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <button type="button" onClick={onCancel} className="retro-btn" disabled={busy}>
            Annuler
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="retro-btn neon-pink"
            disabled={busy || !croppedAreaPixels}
            data-testid="crop-confirm"
          >
            {busy ? "Recadrage…" : "Recadrer"}
          </button>
        </div>
      </div>
    </div>
  );
}
