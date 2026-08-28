"use client";

import { useEffect, useRef, useState } from "react";

interface VoiceRecorderProps {
  onRecorded: (blob: Blob) => void;
}

const MAX_DURATION_MS = 120_000;

export default function VoiceRecorder({ onRecorded }: VoiceRecorderProps) {
  const [recording, setRecording] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoStopRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const elapsedRef = useRef(0);

  function cleanup() {
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoStopRef.current) clearTimeout(autoStopRef.current);
    timerRef.current = null;
    autoStopRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    mediaRecorderRef.current = null;
  }

  async function startRecording() {
    setError(null);
    setBlobUrl(null);
    setElapsed(0);
    elapsedRef.current = 0;

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : "audio/webm";

      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;
      chunksRef.current = [];

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) chunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setBlobUrl(URL.createObjectURL(blob));
        onRecorded(blob);
      };

      recorder.start();
      setRecording(true);

      timerRef.current = setInterval(() => {
        elapsedRef.current += 1000;
        setElapsed(elapsedRef.current);
        if (elapsedRef.current >= MAX_DURATION_MS) {
          stopRecording();
        }
      }, 1000);
    } catch {
      setError("Micro inaccessible — autorise le micro dans ton navigateur pour enregistrer.");
    }
  }

  function stopRecording() {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
    cleanup();
  }

  useEffect(() => {
    return () => {
      cleanup();
      if (blobUrl) URL.revokeObjectURL(blobUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const seconds = Math.floor(elapsed / 1000);
  const minutes = Math.floor(seconds / 60);

  return (
    <div className="retro-box w-full max-w-sm text-center">
      <p className="neon-pink mb-2 text-lg">🎙️ Message vocal</p>

      {recording ? (
        <p className="mb-3 flex items-center justify-center gap-2 text-sm">
          <span
            className="inline-block h-3 w-3 rounded-full bg-red-600 blink"
            style={{ boxShadow: "0 0 8px #ff0000" }}
          />
          Enregistrement… {String(minutes).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}{" "}
          / 02:00
        </p>
      ) : (
        <p className="mb-3 text-sm opacity-80">Enregistre un message (2 min max) pour Caroline !</p>
      )}

      {error && <p className="mb-3 text-sm text-[#ff8080]">{error}</p>}

      <div className="flex justify-center gap-3">
        {!recording ? (
          <button type="button" className="retro-btn" onClick={startRecording}>
            🔴 Enregistrer
          </button>
        ) : (
          <button type="button" className="retro-btn" onClick={stopRecording}>
            ⏹️ Arrêter
          </button>
        )}
        {blobUrl && !recording && (
          <button
            type="button"
            className="retro-btn opacity-70"
            onClick={() => {
              if (blobUrl) URL.revokeObjectURL(blobUrl);
              setBlobUrl(null);
              setElapsed(0);
            }}
          >
            🗑️ Recommencer
          </button>
        )}
      </div>

      {blobUrl && !recording && (
        <div className="mt-3">
          <audio controls src={blobUrl} className="w-full" />
          <p className="mt-1 text-xs opacity-70">Prêt à être envoyé !</p>
        </div>
      )}
    </div>
  );
}
