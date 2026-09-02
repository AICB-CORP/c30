import { createClient } from "@/lib/supabase/server";
import { ALLOWED_BUCKETS, buildUploadPath, createPresignedUploadUrl } from "@/lib/r2";
import { isAllowedContentType, normalizeContentType } from "@/lib/mediaTypes";

export const runtime = "nodejs"; // R2 SDK needs Node runtime (not Edge)

export async function POST(request: Request) {
  const supabase = await createClient();

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

  if (typeof contentType !== "string") {
    return Response.json({ error: "Type de contenu non autorisé" }, { status: 400 });
  }

  const normalizedType = normalizeContentType(contentType);
  if (!isAllowedContentType(normalizedType)) {
    return Response.json({ error: "Type de contenu non autorisé" }, { status: 400 });
  }

  const uploadPath = buildUploadPath(user.id, normalizedType);

  try {
    const { signedUrl, publicUrl } = await createPresignedUploadUrl(uploadPath, normalizedType);
    return Response.json({ uploadPath, signedUrl, publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur inconnue";
    return Response.json({ error: message }, { status: 500 });
  }
}
