"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

interface Props {
  postId: string;
  initialCount: number;
  initialLiked: boolean;
}

export default function CoupDeCoeur({ postId, initialCount, initialLiked }: Props) {
  const [count, setCount] = useState(initialCount);
  const [liked, setLiked] = useState(initialLiked);
  const [burst, setBurst] = useState(false);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    const supabase = createClient();
    if (liked) {
      await supabase.from("coups_de_coeur").delete().eq("post_id", postId);
      setLiked(false);
      setCount((c) => Math.max(0, c - 1));
    } else {
      await supabase.from("coups_de_coeur").insert({ post_id: postId });
      setLiked(true);
      setCount((c) => c + 1);
      setBurst(true);
      setTimeout(() => setBurst(false), 600);
    }
    setBusy(false);
  }

  return (
    <button
      onClick={toggle}
      className={`retro-btn text-sm ${liked ? "heart-burst" : ""}`}
      style={
        liked
          ? { textShadow: "0 0 10px #ff69b4", boxShadow: "0 0 14px rgba(255,20,147,0.9)" }
          : undefined
      }
      aria-pressed={liked}
      title={liked ? "Retirer le coup de cœur" : "Coup de cœur !"}
    >
      <span className={burst ? "heart-burst" : ""}>♥</span> {count} coup{count > 1 ? "s" : ""} de
      cœur
    </button>
  );
}
