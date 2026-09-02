// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase server client
const mockGetUser = vi.fn();
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() => ({
    auth: { getUser: mockGetUser },
  })),
}));

// Mock R2 module
const mockCreatePresignedUploadUrl = vi.fn();
const mockBuildUploadPath = vi.fn((userId: string, ct: string) => {
  const n = String(ct ?? "")
    .toLowerCase()
    .trim()
    .split(";")[0]
    .trim();
  const extMap: Record<string, string> = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/gif": "gif",
    "image/webp": "webp",
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
  const ext = extMap[n] ?? n.split("/")[1];
  return `${userId}/test-uuid.${ext}`;
});
vi.mock("@/lib/r2", () => {
  const allowed = new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/ogg",
    "video/mpeg",
    "video/x-msvideo",
    "video/x-matroska",
    "audio/webm",
    "audio/mp3",
    "audio/mpeg",
    "audio/ogg",
    "audio/wav",
    "audio/x-wav",
    "audio/wave",
    "audio/mp4",
    "audio/aac",
    "audio/flac",
    "audio/x-flac",
  ]);
  function normalizeContentType(ct: string): string {
    return String(ct ?? "")
      .toLowerCase()
      .trim()
      .split(";")[0]
      .trim();
  }
  return {
    ALLOWED_BUCKETS: new Set(["avatars", "post-media"]),
    ALLOWED_CONTENT_TYPES: allowed,
    CONTENT_TYPE_EXT: Object.fromEntries(Array.from(allowed).map((k) => [k, k.split("/")[1]])),
    normalizeContentType,
    isAllowedContentType: (ct: string) => allowed.has(normalizeContentType(ct)),
    buildUploadPath: (...args: unknown[]) => (mockBuildUploadPath as unknown as (...a: unknown[]) => unknown)(...args),
    createPresignedUploadUrl: (...args: unknown[]) => mockCreatePresignedUploadUrl(...args),
  };
});

import { POST } from "./route";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeRequest(body: unknown): Request {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when user is not authenticated", async () => {
    mockGetUser.mockResolvedValue({ data: { user: null } });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.error).toBe("Non authentifié");
  });

  it("returns 400 when body is not valid JSON", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Body JSON invalide");
  });

  it("returns 400 when bucket is invalid", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(makeRequest({ bucket: "admin", contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Bucket invalide");
  });

  it("returns 400 when bucket is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(makeRequest({ contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Bucket invalide");
  });

  it("returns 400 when content type is not allowed", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "application/pdf" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type de contenu non autorisé");
  });

  it("returns 400 when content type is missing", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(makeRequest({ bucket: "post-media" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type de contenu non autorisé");
  });

  it("returns presigned URL and public URL on success", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.jpg",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.jpg",
    });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadPath).toBe("user-123/test-uuid.jpg");
    expect(body.signedUrl).toBe("https://r2.example.com/signed");
    expect(body.publicUrl).toBe("https://pub-test.r2.dev/user-123/test-uuid.jpg");
  });

  it("returns 500 when R2 fails", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });
    mockCreatePresignedUploadUrl.mockRejectedValue(new Error("R2 connection failed"));

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "image/jpeg" }));
    const body = await res.json();

    expect(res.status).toBe(500);
    expect(body.error).toBe("R2 connection failed");
  });

  // -------------------------------------------------------------------------
  // Normalized content-type handling (new mediaTypes logic)
  // -------------------------------------------------------------------------

  it("accepts audio/webm;codecs=opus (normalized) and returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.webm",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.webm",
    });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "audio/webm;codecs=opus" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadPath).toBe("user-123/test-uuid.webm");
    // route should have normalized before calling buildUploadPath / createPresignedUploadUrl
    expect(mockBuildUploadPath).toHaveBeenCalledWith("user-123", "audio/webm");
    expect(mockCreatePresignedUploadUrl).toHaveBeenCalledWith("user-123/test-uuid.webm", "audio/webm");
  });

  it("accepts video/webm;codecs=vp8 (normalized) and returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.webm",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.webm",
    });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "video/webm;codecs=vp8" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockBuildUploadPath).toHaveBeenCalledWith("user-123", "video/webm");
  });

  it("accepts audio/mpeg (mp3) and returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.mp3",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.mp3",
    });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "audio/mpeg" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadPath).toContain(".mp3");
  });

  it("accepts video/quicktime and returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.mov",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.mov",
    });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "video/quicktime" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadPath).toContain(".mov");
    expect(mockBuildUploadPath).toHaveBeenCalledWith("user-123", "video/quicktime");
  });

  it("accepts audio/wav and returns 200", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.wav",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.wav",
    });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "audio/wav" }));
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.uploadPath).toContain(".wav");
  });

  it("accepts uppercase and whitespace variants via normalization", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.webm",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.webm",
    });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "  AUDIO/WEBM;CODECS=OPUS  " }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockBuildUploadPath).toHaveBeenCalledWith("user-123", "audio/webm");
  });

  it("still rejects application/pdf;codecs=opus (normalized to pdf)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "application/pdf;codecs=opus" }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type de contenu non autorisé");
  });

  it("still rejects text/html", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(makeRequest({ bucket: "post-media", contentType: "text/html" }));
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type de contenu non autorisé");
  });

  it("still rejects text/html with codecs param", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "u1" } } });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "text/html;codecs=vp8" }),
    );
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.error).toBe("Type de contenu non autorisé");
  });

  it("accepts video/webm;codecs=vp8,opus (comma-separated codecs)", async () => {
    mockGetUser.mockResolvedValue({ data: { user: { id: "user-123" } } });
    mockCreatePresignedUploadUrl.mockResolvedValue({
      key: "user-123/test-uuid.webm",
      signedUrl: "https://r2.example.com/signed",
      publicUrl: "https://pub-test.r2.dev/user-123/test-uuid.webm",
    });

    const res = await POST(
      makeRequest({ bucket: "post-media", contentType: "video/webm;codecs=vp8,opus" }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(mockBuildUploadPath).toHaveBeenCalledWith("user-123", "video/webm");
  });
});
