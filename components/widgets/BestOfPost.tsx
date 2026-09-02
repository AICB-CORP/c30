"use client";

import { useEffect, useState } from "react";

interface BestOfItem {
  id: string;
  title: string | null;
  author: string;
  created_at: string;
}

export default function BestOfPost({ posts }: { posts: BestOfItem[] }) {
  const [pick, setPick] = useState<BestOfItem | null>(null);

  useEffect(() => {
    if (posts.length === 0) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect -- random rotation is intentional, runs once per posts change
    setPick(posts[Math.floor(Math.random() * posts.length)]);
    const t = setInterval(() => {
      setPick(posts[Math.floor(Math.random() * posts.length)]);
    }, 8000);
    return () => clearInterval(t);
  }, [posts]);

  if (!pick) return null;

  const label = pick.title ? `« ${pick.title} »` : "un post tout neuf";
  return (
    <div className="retro-box overflow-hidden">
      <div className="text-white/70 text-xs mb-1">Best-of aléatoire</div>
      <div className="marquee text-sm">
        <span className="text-white">
          ✨ {label} — par <span className="neon-pink">@{pick.author}</span> ✨
        </span>
      </div>
    </div>
  );
}
