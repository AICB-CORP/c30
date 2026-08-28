import { createClient } from "@/lib/supabase/server";
import BlabWall from "@/components/blab/BlabWall";
import type { BlabMessage } from "@/lib/types";

export const metadata = { title: "Le Blab — Skyblog des 30 ans" };

export default async function BlabPage() {
  const supabase = await createClient();

  const { data: messages } = await supabase
    .from("blab")
    .select("id, author_id, content, created_at, author:profiles(id, pseudo)")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="retro-title mb-6 text-center">Le Blab — laisse ton mot ♥</h1>
      <BlabWall initial={(messages ?? []) as unknown as BlabMessage[]} />
    </div>
  );
}
