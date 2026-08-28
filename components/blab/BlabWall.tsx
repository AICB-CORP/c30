"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { sanitizeText } from "@/lib/sanitize";
import { formatRelativeDate } from "@/lib/utils";
import type { BlabMessage } from "@/lib/types";

interface BlabWallProps {
  initial: BlabMessage[];
}

export default function BlabWall({ initial }: BlabWallProps) {
  const supabase = createClient();
  const [messages, setMessages] = useState<BlabMessage[]>(initial);
  const [me, setMe] = useState<{ id: string; pseudo: string } | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user || cancelled) return;
      const { data } = await supabase
        .from("profiles")
        .select("id, pseudo")
        .eq("id", user.id)
        .maybeSingle();
      if (data && !cancelled) setMe(data);
    })();
    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    const channel = supabase
      .channel("blab-wall")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "blab" },
        async (payload) => {
          const row = payload.new as BlabMessage;
          const { data: author } = await supabase
            .from("profiles")
            .select("id, pseudo")
            .eq("id", row.author_id)
            .maybeSingle();
          setMessages((prev) => {
            if (prev.some((m) => m.id === row.id)) return prev;
            return [
              {
                ...row,
                author: author ?? { id: row.author_id, pseudo: "inconnu" },
              },
              ...prev,
            ];
          });
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const content = text.trim();
    if (!content || !me || sending) return;
    setSending(true);
    setError(null);
    const { data, error: insertError } = await supabase
      .from("blab")
      .insert({ author_id: me.id, content })
      .select("id, author_id, content, created_at")
      .single();
    if (insertError) {
      setError("Impossible d'envoyer ton mot…");
      setSending(false);
      return;
    }
    setText("");
    setMessages((prev) =>
      prev.some((m) => m.id === data.id)
        ? prev
        : [{ ...data, author: { id: me.id, pseudo: me.pseudo } }, ...prev],
    );
    setSending(false);
  }

  return (
    <div>
      <form onSubmit={handleSubmit} className="mb-5 flex gap-2">
        <input
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={280}
          placeholder={`${me ? `Ton mot, @${me.pseudo}…` : "Ton mot…"} (max 280)`}
          className="w-full rounded-full border-2 border-[#ff69b4] bg-black/60 px-4 py-2 text-white outline-none placeholder:text-white/40"
        />
        <button type="submit" disabled={sending || !me} className="retro-btn">
          ♥
        </button>
      </form>

      {error ? (
        <p className="mb-3 rounded-lg border-2 border-red-400 bg-red-900/50 px-3 py-2 text-sm text-red-100">
          {error}
        </p>
      ) : null}

      <div className="space-y-3">
        {messages.length === 0 ? (
          <div className="retro-box py-8 text-center opacity-80">
            Personne n&apos;a encore écrit… sois le premier !
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="retro-box">
              <div className="flex items-baseline gap-2">
                <span className="font-bold text-[#ff69b4]">@{m.author?.pseudo ?? "inconnu"}</span>
                <span className="text-xs opacity-60">{formatRelativeDate(m.created_at)}</span>
              </div>
              <p className="mt-1">{sanitizeText(m.content)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
