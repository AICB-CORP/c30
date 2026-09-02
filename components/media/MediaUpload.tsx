"use client";

import { useEffect, useRef, useState } from "react";
import imageCompression from "browser-image-compression";
import ImageCropper from "./ImageCropper";
import { isCropableImage, MAX_INPUT_BYTES } from "@/lib/imageCrop";
import { CONTENT_TYPE_EXT, normalizeContentType } from "@/lib/mediaTypes";

interface MediaUploadProps {
  kind: "image" | "video" | "audio";
  onUploaded: (path: string, url: string) => void;
  multiple?: boolean;
  maxFiles?: number;
  /**
   * For images only: open the Skyblog cropper modal before upload.
   * Default `true` (matches PROJECT_PLAN §7.1 — posts get a personal touch).
   * Disable for places like the avatar uploader that already handle a
   * square crop in their own way, or for callers who want raw upload.
   */
  enableCropper?: boolean;
  /**
   * Initial cropper aspect ratio (width / height). `undefined` = free.
   * Pass `1` for the avatar upload flow so it stays square by default.
   */
  cropAspect?: number;
}

const MAX_RAW_MB = 50;
const ACCEPT: Record<MediaUploadProps["kind"], string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

const LABELS: Record<MediaUploadProps["kind"], { icon: string; single: string; multi: string }> = {
  image: { icon: "🖼️", single: "Photo", multi: "Photos" },
  video: { icon: "🎬", single: "Vidéo", multi: "Vidéos" },
  audio: { icon: "🎵", single: "Son", multi: "Sons" },
};

/**
 * Target for the compressed image — tighter than the previous default so
 * the R2 free tier (10 Go) can host many more retro photos. PROJECT_PLAN
 * §12 says "vise 2-5 Mo par clip" but for still images sub-1.2 Mo is
 * visually lossless at 1600 px max edge.
 */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1.2,
  maxWidthOrHeight: 1600,
  useWebWorker: true,
  fileType: "image/jpeg" as const,
  initialQuality: 0.85,
};

export default function MediaUpload({
  kind,
  onUploaded,
  multiple = false,
  maxFiles,
  enableCropper = true,
  cropAspect,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  // Pending file awaiting cropper confirm/cancel. Null when no modal open.
  const [pendingCrop, setPendingCrop] = useState<{
    file: File;
    src: string;
    index: number;
    total: number;
  } | null>(null);
  // Queue of files still to process (multi-image flow).
  const queueRef = useRef<File[]>([]);
  const objectUrlRef = useRef<string | null>(null);
  // Monotonically-increasing index of the current file in the batch.
  // Reset to 0 by `startBatch` / `onInputChange` / queue drain. Read by
  // `processNextInQueue` so the user sees "Compression 1/3", "2/3",
  // "3/3" instead of "1/3", "1/2", "1/1".
  const currentIndexRef = useRef(0);

  const meta = LABELS[kind];

  // Revoke any pending object URL on unmount to avoid memory leaks.
  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
      }
    };
  }, []);

  function setObjectUrl(url: string) {
    if (objectUrlRef.current) URL.revokeObjectURL(objectUrlRef.current);
    objectUrlRef.current = url;
  }

  /**
   * Resolves to the next File to process (or null if the queue is empty).
   * Triggers the cropper modal when needed.
   */
  /**
   * Best-effort inference of a content-type from a filename extension
   * when the browser reports an empty `file.type` (common on some
   * mobile browsers / renamed files). Uses the KIND hint to disambiguate
   * ambiguous extensions like .webm / .ogg.
   */
  function inferContentTypeFromFilename(name: string): string | null {
    const ext = name.split(".").pop()?.toLowerCase();
    if (!ext) return null;
    const map: Record<string, string> = {
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      gif: "image/gif",
      webp: "image/webp",
      bmp: "image/bmp",
      mp4: kind === "audio" ? "audio/mp4" : "video/mp4",
      mov: "video/quicktime",
      webm: kind === "video" ? "video/webm" : kind === "audio" ? "audio/webm" : "video/webm",
      ogv: "video/ogg",
      mpeg: "video/mpeg",
      mpg: "video/mpeg",
      avi: "video/x-msvideo",
      mkv: "video/x-matroska",
      mp3: "audio/mpeg",
      wav: "audio/wav",
      wave: "audio/wav",
      m4a: "audio/mp4",
      aac: "audio/aac",
      flac: "audio/flac",
      oga: "audio/ogg",
      ogg: kind === "video" ? "video/ogg" : "audio/ogg",
    };
    return map[ext] ?? null;
  }

  function processNextInQueue(): void {
    const next = queueRef.current.shift();
    if (!next) {
      // Done with the whole batch.
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      currentIndexRef.current = 0;
      setBusy(false);
      return;
    }
    // Per-file sanity cap: a 50 MB+ raw upload would crash
    // `browser-image-compression` (it reads the whole file into memory
    // before compressing). Reject early and skip the rest of the batch.
    if (next.size > MAX_INPUT_BYTES) {
      setError(`Trop lourd : max ${Math.round(MAX_INPUT_BYTES / 1024 / 1024)} Mo.`);
      // Drain remaining queue and reset state.
      queueRef.current = [];
      currentIndexRef.current = 0;
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (kind === "image" && enableCropper && isCropableImage(next)) {
      const src = URL.createObjectURL(next);
      setObjectUrl(src);
      // Monotonically-increasing 0-based index; total = original batch
      // size = files we already shifted out + files still in the queue
      // + 1 (the file we just popped).
      const index = currentIndexRef.current;
      const total = queueRef.current.length + 1 + index;
      currentIndexRef.current = index + 1;
      setPendingCrop({ file: next, src, index, total });
    } else {
      // No cropper → upload directly. Same index/total accounting so
      // "Compression N/total" stays accurate across the whole batch.
      const index = currentIndexRef.current;
      const total = queueRef.current.length + 1 + index;
      currentIndexRef.current = index + 1;
      void uploadSingleFile(next, index, total).then(() => {
        if (queueRef.current.length > 0) {
          processNextInQueue();
        } else {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          currentIndexRef.current = 0;
          setBusy(false);
        }
      });
    }
  }

  async function uploadSingleFile(
    fileOrBlob: File | Blob,
    index: number,
    total: number,
  ): Promise<boolean> {
    let uploadFile: File | Blob = fileOrBlob;

    if (kind === "image") {
      // `imageCompression` (browser-image-compression) requires a File.
      // Convert any Blob coming from the cropper into a File first.
      const input: File =
        fileOrBlob instanceof File
          ? fileOrBlob
          : new File(
              [fileOrBlob],
              `cropped-${Date.now()}.${fileOrBlob.type === "image/png" ? "png" : "jpg"}`,
              { type: fileOrBlob.type },
            );
      setProgress(total > 1 ? `Compression ${index + 1}/${total}…` : "Compression…");
      try {
        uploadFile = await imageCompression(input, {
          ...COMPRESSION_OPTIONS,
          onProgress: (p) =>
            setProgress(
              total > 1
                ? `Compression ${index + 1}/${total}… ${Math.round(p)}%`
                : `Compression… ${Math.round(p)}%`,
            ),
        });
      } catch {
        setError(`Échec compression image ${index + 1}.`);
        setProgress(null);
        return false;
      }
    } else {
      if (fileOrBlob.size > MAX_RAW_MB * 1024 * 1024) {
        setError(`Trop lourd : max ${MAX_RAW_MB} Mo.`);
        setProgress(null);
        return false;
      }
    }

    // Normalise the Blob into a File so R2 has a filename to derive an
    // extension from if the caller hands us a raw Blob (from the cropper).
    if (!(uploadFile instanceof File)) {
      const normalized = normalizeContentType(uploadFile.type);
      const ext = CONTENT_TYPE_EXT[normalized] ?? "jpg";
      uploadFile = new File([uploadFile], `cropped-${Date.now()}.${ext}`, {
        type: uploadFile.type,
      });
    }

    const finalFile = uploadFile as File;

    // Normalize Content-Type: strip codecs param (“audio/webm;codecs=opus” → “audio/webm”),
    // lowercase, and handle empty type via filename inference (common on mobile).
    let effectiveType = normalizeContentType(finalFile.type);
    if (!effectiveType) {
      const inferred = inferContentTypeFromFilename(finalFile.name);
      if (inferred) effectiveType = inferred;
    }
    if (!effectiveType) {
      setError("Type inconnu — renomme ton fichier avec une extension (.mp4, .mp3, .wav…).");
      setProgress(null);
      return false;
    }
    if (!CONTENT_TYPE_EXT[effectiveType]) {
      setError(`Type non supporté : ${effectiveType}`);
      setProgress(null);
      return false;
    }

    setProgress(total > 1 ? `Envoi ${index + 1}/${total}…` : "Envoi…");
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bucket: "post-media",
          contentType: effectiveType,
        }),
      });

      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? "Upload refusé");
      }

      const { uploadPath, signedUrl, publicUrl } = (await res.json()) as {
        uploadPath: string;
        signedUrl: string;
        publicUrl: string;
      };

      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": effectiveType },
        body: finalFile,
      });

      if (!put.ok) {
        throw new Error("Échec transfert.");
      }

      onUploaded(uploadPath, publicUrl);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur upload.");
      return false;
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function startBatch(files: File[]): void {
    const limit = maxFiles ? Math.min(files.length, maxFiles) : files.length;
    queueRef.current = files.slice(0, limit);
    currentIndexRef.current = 0;
    if (maxFiles && files.length > maxFiles) {
      setError(`Max ${maxFiles} fichiers.`);
    }
    setBusy(true);
    setError(null);
    setProgress(null);
    processNextInQueue();
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    if (maxFiles && fileArray.length > maxFiles) {
      setError(`Max ${maxFiles} fichiers.`);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }
    if (kind === "image" && enableCropper) {
      // Open the cropper for the first image and queue the rest.
      queueRef.current = fileArray;
      currentIndexRef.current = 0;
      setBusy(true);
      setError(null);
      setProgress(null);
      processNextInQueue();
    } else {
      // Video/audio/GIF/single: straight upload.
      startBatch(fileArray);
    }
  }

  async function handleCropperConfirm(blob: Blob) {
    // Snapshot the crop context BEFORE clearing pendingCrop — a stale read
    // here would silently upload at the wrong index in the batch.
    const ctx = pendingCrop;
    if (!ctx) return;
    setPendingCrop(null);
    const ok = await uploadSingleFile(blob, ctx.index, ctx.total);
    // After upload, move on to next item in queue (or close out).
    if (ok && ctx.total > 1) {
      setProgress(`Photo ${ctx.index + 1}/${ctx.total} envoyée ✨`);
    }
    // Schedule next crop or finish.
    if (queueRef.current.length > 0) {
      processNextInQueue();
    } else {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
      currentIndexRef.current = 0;
      setBusy(false);
    }
  }

  function handleCropperCancel() {
    setPendingCrop(null);
    // Drop the rest of the queue — user opted out.
    queueRef.current = [];
    currentIndexRef.current = 0;
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    setBusy(false);
    setProgress(null);
    setError("Recadrage annulé.");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        multiple={multiple}
        className="absolute h-0 w-0 overflow-hidden opacity-0"
        style={{ position: "absolute", pointerEvents: "none" }}
        onChange={onInputChange}
        disabled={busy}
        tabIndex={-1}
      />
      <button
        type="button"
        className="retro-btn tool-btn"
        title={
          kind === "image"
            ? "Ajouter des photos/vidéos"
            : kind === "video"
              ? "Ajouter une vidéo"
              : "Ajouter un son"
        }
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "…" : `${meta.icon} ${multiple ? meta.multi : meta.single}`}
      </button>
      {progress && <span className="ml-1 text-xs text-[#ffb6d9]">{progress}</span>}
      {error && <span className="ml-1 text-xs text-[#ff8080]">{error}</span>}
      {pendingCrop && (
        <ImageCropper
          imageSrc={pendingCrop.src}
          fileName={pendingCrop.file.name}
          fileType={pendingCrop.file.type}
          aspect={cropAspect}
          onConfirm={handleCropperConfirm}
          onCancel={handleCropperCancel}
        />
      )}
    </>
  );
}
