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
vi.mock("@/lib/r2", () => ({
  ALLOWED_BUCKETS: new Set(["avatars", "post-media"]),
  ALLOWED_CONTENT_TYPES: new Set([
    "image/jpeg",
    "image/png",
    "image/gif",
    "image/webp",
    "video/mp4",
    "video/webm",
    "audio/webm",
    "audio/mp3",
    "audio/ogg",
  ]),
  buildUploadPath: vi.fn((userId: string, ct: string) => {
    const ext = ct.split("/")[1] === "jpeg" ? "jpg" : ct.split("/")[1];
    return `${userId}/test-uuid.${ext}`;
  }),
  createPresignedUploadUrl: (...args: unknown[]) => mockCreatePresignedUploadUrl(...args),
}));

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
});
