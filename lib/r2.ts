import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const ALLOWED_BUCKETS = new Set(["avatars", "post-media"]);

export const CONTENT_TYPE_EXT: Record<string, string> = {
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

export function isAllowedContentType(contentType: string): boolean {
  return contentType in CONTENT_TYPE_EXT;
}

let cachedClient: S3Client | null = null;

export function getR2Client(): S3Client {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  if (!accountId || !accessKeyId || !secretAccessKey) {
    throw new Error(
      "R2 non configuré : définissez R2_ACCOUNT_ID, R2_ACCESS_KEY_ID et R2_SECRET_ACCESS_KEY",
    );
  }
  if (!cachedClient) {
    cachedClient = new S3Client({
      region: "auto",
      endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
      credentials: { accessKeyId, secretAccessKey },
    });
  }
  return cachedClient;
}

export function buildPublicUrl(key: string): string {
  const base = process.env.R2_PUBLIC_URL;
  if (!base) {
    throw new Error("R2_PUBLIC_URL non défini (URL publique de lecture du bucket)");
  }
  return `${base.replace(/\/+$/, "")}/${key}`;
}

export async function createPresignedUploadUrl(
  key: string,
  contentType: string,
  expiresIn = 600,
): Promise<string> {
  const bucket = process.env.R2_BUCKET_NAME;
  if (!bucket) {
    throw new Error("R2_BUCKET_NAME non défini");
  }
  const client = getR2Client();
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(client, command, { expiresIn });
}
