import { createClient as createServerClient } from "@/lib/supabase/server";
import {
  ALLOWED_BUCKETS,
  CONTENT_TYPE_EXT,
  isAllowedContentType,
  createPresignedUploadUrl,
  buildPublicUrl,
} from "@/lib/r2";

export const runtime = "nodejs";

interface UploadBody {
  bucket?: unknown;
  contentType?: unknown;
}

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
    const body = (await request.json()) as UploadBody;
    bucket = body.bucket;
    contentType = body.contentType;
  } catch {
    return Response.json({ error: "Body JSON invalide" }, { status: 400 });
  }

  if (typeof bucket !== "string" || !ALLOWED_BUCKETS.has(bucket)) {
    return Response.json({ error: "Bucket invalide" }, { status: 400 });
  }

  if (typeof contentType !== "string" || !isAllowedContentType(contentType)) {
    return Response.json({ error: "Type de contenu non autorisé" }, { status: 400 });
  }

  const ext = CONTENT_TYPE_EXT[contentType];
  const uploadPath = `${bucket}/${user.id}/${crypto.randomUUID()}.${ext}`;

  try {
    const signedUrl = await createPresignedUploadUrl(uploadPath, contentType);
    const publicUrl = buildPublicUrl(uploadPath);
    return Response.json({ uploadPath, signedUrl, publicUrl });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Erreur de création d'URL signée";
    return Response.json({ error: message }, { status: 500 });
  }
}
