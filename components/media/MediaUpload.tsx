"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";

interface MediaUploadProps {
  kind: "image" | "video" | "audio";
  onUploaded: (path: string, url: string) => void;
  multiple?: boolean;
  maxFiles?: number;
}

const MAX_RAW_MB = 8;
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

export default function MediaUpload({
  kind,
  onUploaded,
  multiple = false,
  maxFiles,
}: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const meta = LABELS[kind];

  async function uploadSingleFile(file: File, index: number, total: number): Promise<boolean> {
    let uploadFile = file;

    if (kind === "image") {
      setProgress(
        total > 1
          ? `Compression ${index + 1}/${total}…`
          : "Compression…",
      );
      try {
        uploadFile = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
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
      if (file.size > MAX_RAW_MB * 1024 * 1024) {
        setError(`Trop lourd : max ${MAX_RAW_MB} Mo.`);
        setProgress(null);
        return false;
      }
    }

    if (!uploadFile.type) {
      setError("Type inconnu.");
      setProgress(null);
      return false;
    }

    setProgress(
      total > 1
        ? `Envoi ${index + 1}/${total}…`
        : "Envoi…",
    );
    try {
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bucket: "post-media", contentType: uploadFile.type }),
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
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
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
      setBusy(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setBusy(true);
    setError(null);
    setProgress(null);

    const fileArray = Array.from(files);
    const limit = maxFiles ? Math.min(fileArray.length, maxFiles) : fileArray.length;

    if (maxFiles && fileArray.length > maxFiles) {
      setError(`Max ${maxFiles} fichiers.`);
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
      return;
    }

    void (async () => {
      let ok = 0;
      for (let i = 0; i < limit; i++) {
        if (await uploadSingleFile(fileArray[i], i, limit)) ok++;
      }
      if (ok > 0) {
        setProgress(ok > 1 ? `${ok} fichiers envoyés ! ✨` : "Envoyé ! ✨");
      }
      setBusy(false);
    })();
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
        title={kind === "image" ? "Ajouter des photos/vidéos" : kind === "video" ? "Ajouter une vidéo" : "Ajouter un son"}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "…" : `${meta.icon} ${multiple ? meta.multi : meta.single}`}
      </button>
      {progress && <span className="ml-1 text-xs text-[#ffb6d9]">{progress}</span>}
      {error && <span className="ml-1 text-xs text-[#ff8080]">{error}</span>}
    </>
  );
}
