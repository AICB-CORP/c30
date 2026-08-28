import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

export async function GET() {
  const supabase = await createServerClient();

  const { data, error } = await supabase
    .from("visitor_counts")
    .select("count")
    .eq("id", 1)
    .maybeSingle();

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ count: data?.count ?? 0 });
}

export async function POST() {
  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceUrl || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant : définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const admin = createClient(serviceUrl, serviceKey);

  const { data: row } = await admin
    .from("visitor_counts")
    .select("count")
    .eq("id", 1)
    .maybeSingle();

  const next = Number(row?.count ?? 0) + 1;

  const { error } = await admin.from("visitor_counts").update({ count: next }).eq("id", 1);

  if (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }

  return Response.json({ count: next });
}
