import { createClient } from "@supabase/supabase-js";
import { createClient as createServerClient } from "@/lib/supabase/server";

const ALLOWED_BUCKETS = new Set(["avatars", "post-media"]);

const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
};

export async function POST(request: Request) {
  const supabase = await createServerClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return Response.json({ error: "Non authentifié" }, { status: 401 });
  }

  let bucket: unknown;
  let contentType: unknown;
  try {
    const body = (await request.json()) as { bucket?: unknown; contentType?: unknown };
    bucket = body.bucket;
    contentType = body.contentType;
  } catch {
    return Response.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (typeof bucket !== "string" || !ALLOWED_BUCKETS.has(bucket)) {
    return Response.json({ error: "Bucket invalide" }, { status: 400 });
  }

  if (typeof contentType !== "string" || !(contentType in CONTENT_TYPE_EXT)) {
    return Response.json({ error: "Type de contenu non autorisé" }, { status: 400 });
  }

  const serviceUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceUrl || !serviceKey) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY manquant : définissez NEXT_PUBLIC_SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY",
    );
  }

  const admin = createClient(serviceUrl, serviceKey);
  const ext = CONTENT_TYPE_EXT[contentType];
  const uploadPath = `${user.id}/${crypto.randomUUID()}.${ext}`;

  const { data, error } = await admin.storage
    .from(bucket)
    .createSignedUploadUrl(uploadPath, { upsert: false });

  if (error || !data) {
    return Response.json(
      { error: error?.message ?? "Erreur de création d'URL signée" },
      { status: 500 },
    );
  }

  return Response.json({ uploadPath: data.path, signedUrl: data.signedUrl });
}
