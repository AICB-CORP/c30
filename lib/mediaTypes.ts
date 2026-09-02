/**
 * Shared media type allowlist — safe for both client and server.
 *
 * Extracted from lib/r2.ts so that client components (MediaUpload)
 * can import without pulling in the AWS SDK / server-only code.
 */

export const CONTENT_TYPE_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/bmp": "bmp",
  "video/mp4": "mp4",
  "video/webm": "webm",
  "video/quicktime": "mov",
  "video/ogg": "ogv",
  "video/mpeg": "mpeg",
  "video/x-msvideo": "avi",
  "video/x-matroska": "mkv",
  "audio/webm": "webm",
  "audio/mp3": "mp3",
  "audio/mpeg": "mp3",
  "audio/ogg": "ogg",
  "audio/wav": "wav",
  "audio/x-wav": "wav",
  "audio/wave": "wav",
  "audio/mp4": "mp4",
  "audio/aac": "aac",
  "audio/flac": "flac",
  "audio/x-flac": "flac",
};

export const ALLOWED_CONTENT_TYPES = new Set(Object.keys(CONTENT_TYPE_EXT));

/**
 * Normalizes a Content-Type string for allowlist lookup:
 * lowercases, trims, and strips any codec/param after ';' (e.g.
 * "audio/webm;codecs=opus" → "audio/webm").
 * Safe for empty / undefined input.
 */
export function normalizeContentType(ct: string): string {
  return String(ct ?? "")
    .toLowerCase()
    .trim()
    .split(";")[0]
    .trim();
}

export function isAllowedContentType(ct: string): boolean {
  return ALLOWED_CONTENT_TYPES.has(normalizeContentType(ct));
}
