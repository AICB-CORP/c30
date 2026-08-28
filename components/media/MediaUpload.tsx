"use client";

import { useRef, useState } from "react";
import imageCompression from "browser-image-compression";

interface MediaUploadProps {
  kind: "image" | "video" | "audio";
  onUploaded: (path: string, url: string) => void;
}

const MAX_RAW_MB = 8;
const ACCEPT: Record<MediaUploadProps["kind"], string> = {
  image: "image/*",
  video: "video/*",
  audio: "audio/*",
};

export default function MediaUpload({ kind, onUploaded }: MediaUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const label =
    kind === "image"
      ? "🖼️ Ajouter une photo"
      : kind === "video"
        ? "🎬 Ajouter une vidéo"
        : "🎵 Ajouter un son";

  async function handleFile(file: File) {
    setError(null);
    setProgress(null);

    let uploadFile = file;

    if (kind === "image") {
      setProgress("Compression de l'image…");
      try {
        uploadFile = await imageCompression(file, {
          maxSizeMB: 1.5,
          maxWidthOrHeight: 1600,
          useWebWorker: true,
          onProgress: (p) => setProgress(`Compression… ${Math.round(p)}%`),
        });
      } catch {
        setError("Échec de la compression de l'image.");
        setProgress(null);
        return;
      }
    } else {
      if (file.size > MAX_RAW_MB * 1024 * 1024) {
        setError(`Fichier trop lourd : plus de ${MAX_RAW_MB} Mo (il n'est pas compressé).`);
        setProgress(null);
        return;
      }
    }

    if (!uploadFile.type) {
      setError("Type de fichier inconnu.");
      setProgress(null);
      return;
    }

    setProgress("Création de l'URL signée…");
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

      const { uploadPath, signedUrl } = (await res.json()) as {
        uploadPath: string;
        signedUrl: string;
      };

      setProgress("Envoi du fichier…");
      const put = await fetch(signedUrl, {
        method: "PUT",
        headers: { "Content-Type": uploadFile.type },
        body: uploadFile,
      });

      if (!put.ok) {
        throw new Error("Échec du transfert vers le stockage.");
      }

      const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/post-media/${uploadPath}`;
      onUploaded(uploadPath, url);
      setProgress("Fichier envoyé ! ✨");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur pendant l'upload.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function onInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setBusy(true);
    void handleFile(file);
  }

  return (
    <div className="retro-box w-full max-w-sm text-center">
      <p className="neon-pink mb-2 text-lg">{label}</p>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT[kind]}
        className="hidden"
        onChange={onInputChange}
        disabled={busy}
      />
      <button
        type="button"
        className="retro-btn"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
      >
        {busy ? "Envoi en cours…" : "Choisir un fichier"}
      </button>

      {progress && !busy && <p className="mt-2 text-sm opacity-80">{progress}</p>}
      {busy && progress && <p className="mt-2 text-sm blink">{progress}</p>}
      {error && <p className="mt-2 text-sm text-[#ff8080]">{error}</p>}
      {kind !== "image" && (
        <p className="mt-2 text-xs opacity-60">
          Max {MAX_RAW_MB} Mo — pas de compression pour les vidéos/sons.
        </p>
      )}
    </div>
  );
}
