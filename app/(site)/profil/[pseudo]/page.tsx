import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { sanitizeText } from "@/lib/sanitize";
import PostCard from "@/components/post/PostCard";
import type { PostWithRelations } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params;
  return { title: `Le skyblog de ${pseudo}` };
}

export default async function ProfilPage({ params }: { params: Promise<{ pseudo: string }> }) {
  const { pseudo } = await params;
  const supabase = await createClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, pseudo, avatar_url, bio, mood, role, created_at")
    .eq("pseudo", pseudo)
    .maybeSingle();

  if (!profile) notFound();

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

  const { data: posts } = await supabase
    .from("posts")
    .select("*, author:profiles(id, pseudo, avatar_url, mood), media:post_media(*)")
    .eq("author_id", profile.id)
    .order("created_at", { ascending: false });

  const postList = (posts ?? []) as PostWithRelations[];

  return (
    <div className="mx-auto max-w-3xl">
      <div className="retro-pink-box mb-6 text-center">
        <div className="flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-5">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt={`Avatar de ${profile.pseudo}`}
              className="h-24 w-24 rounded-full border-4 border-white object-cover shadow-[0_0_15px_rgba(255,255,255,0.5)]"
            />
          ) : (
            <div className="flex h-24 w-24 items-center justify-center rounded-full border-4 border-white bg-black/40 text-4xl">
              👽
            </div>
          )}
          <div>
            <h1 className="retro-title">@{profile.pseudo}</h1>
            {profile.mood ? (
              <p className="mt-1 text-sm font-bold">🎭 {sanitizeText(profile.mood)}</p>
            ) : null}
          </div>
        </div>
        {profile.bio ? (
          <p className="mx-auto mt-4 max-w-xl text-sm">{sanitizeText(profile.bio)}</p>
        ) : null}
      </div>

      {postList.length === 0 ? (
        <div className="retro-box py-8 text-center">Ce skyblog est encore vide… patience !</div>
      ) : (
        postList.map((post) => <PostCard key={post.id} post={post} currentUserPseudo={mePseudo} />)
      )}
    </div>
  );
}
