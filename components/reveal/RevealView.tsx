"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";
import Link from "next/link";
import PostCard from "@/components/post/PostCard";
import type { PostWithRelations } from "@/lib/types";

interface RevealViewProps {
  posts: PostWithRelations[];
}

export default function RevealView({ posts }: RevealViewProps) {
  useEffect(() => {
    const colors = ["#ff69b4", "#8b00ff", "#00bfff", "#ffd700", "#00ff88"];
    const burst = () => {
      confetti({ particleCount: 70, spread: 100, origin: { y: 0.3 }, colors });
      confetti({ particleCount: 30, angle: 60, spread: 60, origin: { x: 0 }, colors });
      confetti({ particleCount: 30, angle: 120, spread: 60, origin: { x: 1 }, colors });
    };
    burst();
    const interval = window.setInterval(burst, 700);
    const stop = window.setTimeout(() => window.clearInterval(interval), 3500);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(stop);
    };
  }, []);

  return (
    <div className="space-y-8">
      <div className="space-y-3 text-center">
        <h1 className="retro-title">Bienvenue dans tes 30 ans ♥</h1>
        <p className="neon-blue">Tout ce que tes amis ont écrit pour toi… bonne lecture.</p>
      </div>

      {posts.length === 0 ? (
        <div className="retro-box py-10 text-center">Le blog est encore vide… patience !</div>
      ) : (
        posts.map((post) => <PostCard key={post.id} post={post} />)
      )}

      <div className="retro-pink-box space-y-4 py-10 text-center">
        <p className="text-2xl font-bold">Fin du blog… tu es officiellement la plus aimée. ♥</p>
        <Link href="/" className="retro-btn">
          Retour au blog
        </Link>
      </div>
    </div>
  );
}
