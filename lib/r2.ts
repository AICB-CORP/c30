/**
 * Cloudflare R2 storage client (server-only).
 *
 * This module must NEVER be imported by client components — it reads
 * R2_SECRET_ACCESS_KEY from environment variables.
 *
 * Flow: client POST /api/upload → server mints presigned PUT + publicUrl
 *       → client PUTs file directly to R2 → inserts publicUrl in DB.
 */

import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Content-type allowlist (matches app/api/upload/route.ts)
// ---------------------------------------------------------------------------

export const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "video/mp4": "mp4",
  "video/webm": "mp4", // R2 doesn't care about ext, but we normalise
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/ogg": "ogg",
};

export const ALLOWED_CONTENT_TYPES = new Set(Object.keys(CONTENT_TYPE_EXT));

export function isAllowedContentType(ct: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(ct);
}

// ---------------------------------------------------------------------------
// Bucket allowlist (defense-in-depth — route.ts also validates)
// ---------------------------------------------------------------------------

export const ALLOWED_BUCKETS = new Set(["avatars", "post-media"]);

// ---------------------------------------------------------------------------
// S3Client factory (lazy singleton — only constructed when env vars exist)
// ---------------------------------------------------------------------------

let _client: S3Client | null = null;

export function getR2Client(): S3Client {
  if (_client) return _client;

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 non configuré : définissez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY (voir .env.example)",
    );
  }

  _client = new S3Client({
    region: "auto",
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
  });

  return _client;
}

// ---------------------------------------------------------------------------
// Presigned upload URL
// ---------------------------------------------------------------------------

export interface PresignedUpload {
  /** Object key within the bucket: `{userId}/{uuid}.{ext}` */
  key: string;
  /** Presigned PUT URL (valid 600 s, content-type pinned) */
  signedUrl: string;
  /** Public read URL (`R2_PUBLIC_URL/{key}`) */
  publicUrl: string;
}

const PRESIGNED_URL_TTL = 600; // seconds

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
): Promise<PresignedUpload> {
  const client = getR2Client();
  const bucket = process.env.R2_BUCKET_NAME;

  if (!bucket) {
    throw new Error("R2_BUCKET_NAME manquant (voir .env.example)");
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });

  const signedUrl = await getSignedUrl(client, command, {
    expiresIn: PRESIGNED_URL_TTL,
  });

  return { key, signedUrl, publicUrl: buildPublicUrl(key) };
}

// ---------------------------------------------------------------------------
// Public URL builder
// ---------------------------------------------------------------------------

export function buildPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_URL manquant (voir .env.example)");
  }
  // Strip trailing slash if present
  return `${base.replace(/\/+$/, "")}/${key}`;
}

// ---------------------------------------------------------------------------
// Upload path generator
// ---------------------------------------------------------------------------

export function buildUploadPath(userId: string, contentType: string): string {
  const ext = CONTENT_TYPE_EXT[contentType];
  if (!ext) throw new Error(`Type de contenu non autorisé : ${contentType}`);
  return `${userId}/${crypto.randomUUID()}.${ext}`;
}
