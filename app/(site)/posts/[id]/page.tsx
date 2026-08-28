import { notFound } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post/PostCard";
import type { PostWithRelations } from "@/lib/types";

export const metadata = { title: "Un post — Skyblog des 30 ans" };

export default async function PostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: post } = await supabase
    .from("posts")
    .select("*, author:profiles(id, pseudo, avatar_url, mood), media:post_media(*)")
    .eq("id", id)
    .maybeSingle();

  if (!post) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  let mePseudo = "";
  if (user) {
    const { data: me } = await supabase
      .from("profiles")
      .select("pseudo")
      .eq("id", user.id)
      .maybeSingle();
    mePseudo = me?.pseudo ?? "";
  }

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/" className="retro-btn mb-4">
        ← Retour au blog
      </Link>
      <PostCard post={post as PostWithRelations} currentUserPseudo={mePseudo} />
    </div>
  );
}
