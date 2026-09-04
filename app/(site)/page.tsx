import { createClient } from "@/lib/supabase/server";
import PostCard from "@/components/post/PostCard";
import NewPostButton from "@/components/post/NewPostButton";
import Countdown from "@/components/widgets/Countdown";
import HitCounter from "@/components/widgets/HitCounter";
import FriendRanking from "@/components/widgets/FriendRanking";
import BestOfPost from "@/components/widgets/BestOfPost";
import type { PostWithRelations } from "@/lib/types";

export const metadata = { title: "Accueil — Skyblog des 30 ans" };

export default async function HomePage() {
  const supabase = await createClient();
  const now = new Date();

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!posts_author_id_fkey(id, pseudo, avatar_url, mood), media:post_media(*)",
    )
    .or(`scheduled_for.is.null,scheduled_for.lte.${now.toISOString()}`)
    .order("created_at", { ascending: false })
    .order("position", { referencedTable: "post_media", ascending: true })
    .limit(20);

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

  const [{ data: profiles }, { data: allPosts }] = await Promise.all([
    supabase.from("profiles").select("id, pseudo, role"),
    supabase.from("posts").select("author_id"),
  ]);
  const counts = new Map<string, number>();
  for (const p of allPosts ?? []) {
    counts.set(p.author_id, (counts.get(p.author_id) ?? 0) + 1);
  }
  const friends = (profiles ?? [])
    .filter((p) => p.role !== "birthday_girl")
    .map((p) => ({ pseudo: p.pseudo, count: counts.get(p.id) ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const { data: bestOfRows } = await supabase
    .from("posts")
    .select("id, title, created_at, author:profiles!posts_author_id_fkey(pseudo)")
    .order("created_at", { ascending: false })
    .limit(5);
  const bestOf = (
    (bestOfRows ?? []) as unknown as Array<{
      id: string;
      title: string | null;
      created_at: string;
      author: { pseudo: string } | null;
    }>
  ).map((row) => ({
    id: row.id,
    title: row.title,
    author: row.author?.pseudo ?? "?",
    created_at: row.created_at,
  }));

  const postList = (posts ?? []) as PostWithRelations[];

  return (
    <div className="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        {postList.length === 0 ? (
          <div className="retro-box py-10 text-center">
            <p className="neon-pink text-xl">Aucun post pour l&apos;instant… lance le bal !</p>
          </div>
        ) : (
          postList.map((post) => (
            <PostCard key={post.id} post={post} currentUserPseudo={mePseudo} />
          ))
        )}
      </div>

      <aside className="space-y-4 self-start lg:sticky lg:top-4">
        <Countdown />
        <HitCounter />
        <FriendRanking friends={friends} />
        <BestOfPost posts={bestOf} />
      </aside>

      <NewPostButton />
    </div>
  );
}
