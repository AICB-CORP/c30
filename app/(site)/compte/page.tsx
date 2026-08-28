"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeText } from "@/lib/sanitize";
import MediaUpload from "@/components/media/MediaUpload";
import type { Profile } from "@/lib/types";

const MOOD_SUGGESTIONS = [
  "amoureuse",
  "nostalgique",
  "en mode 2004",
  "festive",
  "déterminée",
  "fatiguée",
];

export default function ComptePage() {
  const supabase = createClient();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [bio, setBio] = useState("");
  const [mood, setMood] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      if (data && !cancelled) {
        setProfile(data);
        setBio(data.bio ?? "");
        setMood(data.mood ?? "");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  async function handleSave() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    setSaved(false);
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ bio: sanitizeText(bio), mood: sanitizeText(mood) })
      .eq("id", profile.id);
    setSaving(false);
    if (updateError) {
      setError("Erreur lors de la sauvegarde.");
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  }

  async function handleAvatarUploaded(_path: string, url: string) {
    if (!profile) return;
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: url })
      .eq("id", profile.id);
    if (updateError) {
      setError("Erreur lors de la mise à jour de l'avatar.");
      return;
    }
    setProfile({ ...profile, avatar_url: url });
  }

  if (!profile) {
    return <div className="retro-box py-10 text-center">Chargement de ton compte…</div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div className="retro-pink-box text-center">
        <h1 className="retro-title">⚙️ Mon compte</h1>
        <p className="mt-2">
          <span className="font-bold">@{profile.pseudo}</span> —{" "}
          {profile.role === "birthday_girl" ? (
            <span>⭐ L&apos;invitée d&apos;honneur</span>
          ) : (
            <span>👋 Ami(e) du blog</span>
          )}
        </p>
      </div>

      <div className="retro-box space-y-5">
        <div>
          <p className="mb-2 font-bold">🖼 Avatar</p>
          <div className="flex flex-wrap items-center gap-4">
            {profile.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Ton avatar"
                className="h-20 w-20 rounded-full border-4 border-[#ff69b4] object-cover"
              />
            ) : (
              <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-[#ff69b4] bg-black/40 text-3xl">
                👽
              </div>
            )}
            <MediaUpload kind="image" onUploaded={handleAvatarUploaded} />
          </div>
        </div>

        <div>
          <label htmlFor="bio" className="mb-1 block font-bold">
            💌 Bio
          </label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            maxLength={400}
            rows={3}
            placeholder="Ta phrase d'amour pour elle…"
            className="w-full rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-white outline-none placeholder:text-white/40"
          />
        </div>

        <div>
          <label htmlFor="mood" className="mb-1 block font-bold">
            🎭 Humeur du jour
          </label>
          <input
            id="mood"
            type="text"
            value={mood}
            onChange={(e) => setMood(e.target.value)}
            maxLength={40}
            placeholder="ex. nostalgique 💜"
            className="mb-2 w-full rounded-lg border-2 border-[#ff69b4] bg-black/60 px-3 py-2 text-white outline-none placeholder:text-white/40"
          />
          <div className="flex flex-wrap gap-1.5">
            {MOOD_SUGGESTIONS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setMood(s)}
                className={`rounded-full border px-2 py-0.5 text-xs ${
                  mood === s
                    ? "border-[#ff69b4] bg-[#ff69b4] text-white"
                    : "border-[#ff69b4]/60 bg-black/40 text-[#ffb6d9]"
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <p className="rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
            {error}
          </p>
        ) : null}

        <div className="flex items-center gap-3">
          <button type="button" className="retro-btn" onClick={handleSave} disabled={saving}>
            {saving ? "Sauvegarde…" : "💾 Sauvegarder"}
          </button>
          {saved ? <span className="neon-pink font-bold">Sauvegardé ♥</span> : null}
        </div>
      </div>
    </div>
  );
}
