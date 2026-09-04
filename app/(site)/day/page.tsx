import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import RevealView from "@/components/reveal/RevealView";
import type { PostWithRelations } from "@/lib/types";

export const metadata = { title: "Jour J — Skyblog des 30 ans" };

export default async function DayPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();
  if (profile?.role !== "birthday_girl") redirect("/");

  const { data: posts } = await supabase
    .from("posts")
    .select(
      "*, author:profiles!posts_author_id_fkey(id, pseudo, avatar_url, mood), media:post_media(*)",
    )
    .order("created_at", { ascending: true });

  return (
    <div className="mx-auto max-w-3xl">
      <RevealView posts={(posts ?? []) as PostWithRelations[]} />
    </div>
  );
}
