// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/r2", () => {
  const map: Record<string, string> = {
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
  return {
    ALLOWED_BUCKETS: new Set(["avatars", "post-media"]),
    CONTENT_TYPE_EXT: map,
    isAllowedContentType: (ct: string) => ct in map,
    createPresignedUploadUrl: vi.fn(async () => "https://r2.example/signed"),
    buildPublicUrl: (key: string) => `https://pub.example/${key}`,
  };
});

import { POST } from "@/app/api/upload/route";
import { createClient } from "@/lib/supabase/server";

function makeRequest(body: unknown) {
  return new Request("http://localhost/api/upload", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
}

function authenticated() {
  vi.mocked(createClient).mockResolvedValue({
    auth: { getUser: async () => ({ data: { user: { id: "u1" } } }) },
  } as unknown as SupabaseClient);
}

describe("POST /api/upload", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns 401 when not authenticated", async () => {
    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as unknown as SupabaseClient);
    const res = await POST(makeRequest({ bucket: "post-media", contentType: "image/jpeg" }));
    expect(res.status).toBe(401);
  });

  it("returns 400 for invalid bucket", async () => {
    authenticated();
    const res = await POST(makeRequest({ bucket: "evil", contentType: "image/jpeg" }));
    expect(res.status).toBe(400);
  });

  it("returns 400 for disallowed content type", async () => {
    authenticated();
    const res = await POST(makeRequest({ bucket: "post-media", contentType: "text/html" }));
    expect(res.status).toBe(400);
  });

  it("returns signed + public urls for valid request", async () => {
    authenticated();
    const res = await POST(makeRequest({ bucket: "post-media", contentType: "image/jpeg" }));
    expect(res.status).toBe(200);
    const json = await res.json();
    expect(json.uploadPath).toMatch(/^post-media\/u1\/[\w-]+\.jpg$/);
    expect(json.signedUrl).toBe("https://r2.example/signed");
    expect(json.publicUrl).toBe(`https://pub.example/${json.uploadPath}`);
  });

  it("returns 400 on malformed JSON", async () => {
    authenticated();
    const req = new Request("http://localhost/api/upload", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});
