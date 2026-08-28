"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { sanitizeHtml, isSafeIframe } from "@/lib/sanitize";
import { formatRelativeDate } from "@/lib/utils";
import CoupDeCoeur from "@/components/widgets/CoupDeCoeur";
import RetroEditor from "@/components/editor/RetroEditor";
import type { PostWithRelations } from "@/lib/types";

interface PostCardProps {
  post: PostWithRelations;
  currentUserPseudo?: string;
}

export default function PostCard({ post, currentUserPseudo }: PostCardProps) {
  const router = useRouter();
  const [me, setMe] = useState<{ id: string } | null>(null);
  const [likeState, setLikeState] = useState<{
    count: number;
    liked: boolean;
  } | null>(null);
  const [editing, setEditing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (cancelled) return;
      setMe(user ? { id: user.id } : null);

      const [countRes, likeRes] = await Promise.all([
        supabase
          .from("coups_de_coeur")
          .select("user_id", { count: "exact", head: true })
          .eq("post_id", post.id),
        user
          ? supabase
              .from("coups_de_coeur")
              .select("user_id")
              .eq("post_id", post.id)
              .eq("user_id", user.id)
              .maybeSingle()
          : Promise.resolve({ data: null }),
      ]);
      if (cancelled) return;
      setLikeState({
        count: countRes.count ?? 0,
        liked: Boolean(likeRes.data),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [post.id]);

  const isOwner =
    (me?.id != null && post.author_id === me.id) ||
    Boolean(currentUserPseudo && post.author?.pseudo === currentUserPseudo);

  async function handleDelete() {
    if (!window.confirm("Supprimer ce post ? Cette action est définitive.")) {
      return;
    }
    setDeleting(true);
    const supabase = createClient();
    await supabase.from("posts").delete().eq("id", post.id);
    setDeleting(false);
    router.refresh();
  }

  return (
    <article className="retro-box mb-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Link
          href={`/profil/${post.author?.pseudo ?? ""}`}
          className="font-bold text-[#ff69b4] hover:underline"
        >
          @{post.author?.pseudo ?? "inconnu"}
        </Link>
        <div className="flex flex-wrap items-center gap-2 text-xs opacity-80">
          {post.author?.mood ? (
            <span className="rounded-full border border-[#ff69b4] bg-black/50 px-2 py-0.5 text-[#ffb6d9]">
              {post.author.mood}
            </span>
          ) : null}
          <span>{formatRelativeDate(post.created_at)}</span>
        </div>
      </div>

      {post.title ? <h2 className="neon-pink retro-title mt-3 text-2xl">{post.title}</h2> : null}

      <div className="mt-1 text-xs font-bold">
        {post.is_private ? (
          <span className="text-[#ffd700]">🔒 Privé</span>
        ) : (
          <span className="text-[#00ff88]">🌍 Public</span>
        )}
      </div>

      <div
        className="post-content mt-3"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content) }}
      />

      {post.music_embed && isSafeIframe(post.music_embed) ? (
        <div className="mt-3" dangerouslySetInnerHTML={{ __html: post.music_embed }} />
      ) : null}

      {post.media.length > 0 ? (
        <div className="mt-3 space-y-2">
          {post.media.map((m) => (
            <div key={m.id}>
              {m.type === "image" || m.type === "gif" ? (
                <img
                  src={m.url}
                  alt={m.caption ?? ""}
                  className="max-w-full rounded-lg border-4 border-[#ff69b4]"
                />
              ) : null}
              {m.type === "video" ? (
                <video src={m.url} controls className="max-w-full rounded-lg" />
              ) : null}
              {m.type === "audio" ? <audio src={m.url} controls className="w-full" /> : null}
            </div>
          ))}
        </div>
      ) : null}

      {likeState ? (
        <div className="mt-3">
          <CoupDeCoeur
            postId={post.id}
            initialCount={likeState.count}
            initialLiked={likeState.liked}
          />
        </div>
      ) : null}

      {isOwner ? (
        <div className="mt-3 flex gap-2">
          <button type="button" className="retro-btn" onClick={() => setEditing(true)}>
            ✏️ Modifier
          </button>
          <button
            type="button"
            className="retro-btn"
            style={{ background: "linear-gradient(180deg, #ff4444, #a00000)" }}
            onClick={handleDelete}
            disabled={deleting}
          >
            🗑️ Supprimer
          </button>
        </div>
      ) : null}

      {editing ? (
        <RetroEditor
          existing={post}
          onDone={() => {
            setEditing(false);
            router.refresh();
          }}
          onCancel={() => setEditing(false)}
        />
      ) : null}
    </article>
  );
}
