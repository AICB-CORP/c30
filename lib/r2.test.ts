// @vitest-environment node
import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock the AWS SDK modules before importing the module under test
vi.mock("@aws-sdk/client-s3", () => {
  return {
    S3Client: vi.fn().mockImplementation(() => ({})),
    PutObjectCommand: vi.fn().mockImplementation((input) => ({ input })),
  };
});

vi.mock("@aws-sdk/s3-request-presigner", () => {
  return {
    getSignedUrl: vi.fn().mockResolvedValue("https://r2.example.com/signed-upload"),
  };
});

import {
  CONTENT_TYPE_EXT,
  ALLOWED_CONTENT_TYPES,
  ALLOWED_BUCKETS,
  isAllowedContentType,
  getR2Client,
  createPresignedUploadUrl,
  buildPublicUrl,
  buildUploadPath,
} from "./r2";
import { S3Client } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// ---------------------------------------------------------------------------
// Content-type allowlist
// ---------------------------------------------------------------------------

describe("CONTENT_TYPE_EXT", () => {
  it("maps image/jpeg → jpg", () => {
    expect(CONTENT_TYPE_EXT["image/jpeg"]).toBe("jpg");
  });

  it("maps audio/webm → webm", () => {
    expect(CONTENT_TYPE_EXT["audio/webm"]).toBe("webm");
  });

  it("does not contain application/pdf", () => {
    expect(CONTENT_TYPE_EXT["application/pdf"]).toBeUndefined();
  });

  it("maps video/webm → webm (not mp4)", () => {
    expect(CONTENT_TYPE_EXT["video/webm"]).toBe("webm");
    expect(CONTENT_TYPE_EXT["video/webm"]).not.toBe("mp4");
  });

  it("maps audio/mpeg → mp3", () => {
    expect(CONTENT_TYPE_EXT["audio/mpeg"]).toBe("mp3");
  });

  it("maps video/quicktime → mov", () => {
    expect(CONTENT_TYPE_EXT["video/quicktime"]).toBe("mov");
  });

  it("maps audio/wav variants → wav", () => {
    expect(CONTENT_TYPE_EXT["audio/wav"]).toBe("wav");
    expect(CONTENT_TYPE_EXT["audio/x-wav"]).toBe("wav");
    expect(CONTENT_TYPE_EXT["audio/wave"]).toBe("wav");
  });

  it("maps video/x-msvideo → avi and video/x-matroska → mkv", () => {
    expect(CONTENT_TYPE_EXT["video/x-msvideo"]).toBe("avi");
    expect(CONTENT_TYPE_EXT["video/x-matroska"]).toBe("mkv");
  });

  it("contains exactly 23 entries", () => {
    expect(Object.keys(CONTENT_TYPE_EXT)).toHaveLength(23);
  });
});

describe("ALLOWED_CONTENT_TYPES", () => {
  it("contains 23 entries", () => {
    expect(ALLOWED_CONTENT_TYPES.size).toBe(23);
  });
});

describe("normalizeContentType (re-exported from mediaTypes)", () => {
  it("lowercases and trims", async () => {
    const { normalizeContentType: n } = await import("./r2");
    expect(n("Audio/WEBM")).toBe("audio/webm");
    expect(n("  video/mp4  ")).toBe("video/mp4");
  });

  it("strips codecs param", async () => {
    const { normalizeContentType: n } = await import("./r2");
    expect(n("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(n("video/webm;codecs=vp8")).toBe("video/webm");
    expect(n("video/webm;codecs=vp8,opus")).toBe("video/webm");
    expect(n("audio/webm; codecs=opus ")).toBe("audio/webm");
  });

  it("handles empty / whitespace", async () => {
    const { normalizeContentType: n } = await import("./r2");
    expect(n("")).toBe("");
    expect(n("   ")).toBe("");
  });

  it("re-export is identical to mediaTypes implementation", async () => {
    const r2 = await import("./r2");
    const mt = await import("./mediaTypes");
    expect(r2.normalizeContentType).toBe(mt.normalizeContentType);
    expect(r2.isAllowedContentType).toBe(mt.isAllowedContentType);
    expect(r2.CONTENT_TYPE_EXT).toBe(mt.CONTENT_TYPE_EXT);
    expect(r2.ALLOWED_CONTENT_TYPES).toBe(mt.ALLOWED_CONTENT_TYPES);
  });
});

describe("isAllowedContentType", () => {
  it("returns true for allowed types", () => {
    expect(isAllowedContentType("image/jpeg")).toBe(true);
    expect(isAllowedContentType("video/mp4")).toBe(true);
    expect(isAllowedContentType("audio/ogg")).toBe(true);
  });

  it("returns true for audio/mpeg, video/quicktime, audio/wav, video/webm", () => {
    expect(isAllowedContentType("audio/mpeg")).toBe(true);
    expect(isAllowedContentType("video/quicktime")).toBe(true);
    expect(isAllowedContentType("audio/wav")).toBe(true);
    expect(isAllowedContentType("video/webm")).toBe(true);
    expect(isAllowedContentType("audio/x-wav")).toBe(true);
    expect(isAllowedContentType("audio/wave")).toBe(true);
  });

  it("returns true for types with codecs param (normalized)", () => {
    expect(isAllowedContentType("audio/webm;codecs=opus")).toBe(true);
    expect(isAllowedContentType("video/webm;codecs=vp8")).toBe(true);
    expect(isAllowedContentType("video/webm;codecs=vp8,opus")).toBe(true);
    expect(isAllowedContentType("Audio/WEBM;codecs=Opus")).toBe(true);
  });

  it("returns false for disallowed types", () => {
    expect(isAllowedContentType("application/pdf")).toBe(false);
    expect(isAllowedContentType("text/plain")).toBe(false);
    expect(isAllowedContentType("")).toBe(false);
  });

  it("returns false for disallowed types even with codecs param", () => {
    expect(isAllowedContentType("application/pdf;codecs=opus")).toBe(false);
    expect(isAllowedContentType("text/html;codecs=vp8")).toBe(false);
  });

  it("returns false for text/html", () => {
    expect(isAllowedContentType("text/html")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Bucket allowlist
// ---------------------------------------------------------------------------

describe("ALLOWED_BUCKETS", () => {
  it("contains avatars and post-media", () => {
    expect(ALLOWED_BUCKETS.has("avatars")).toBe(true);
    expect(ALLOWED_BUCKETS.has("post-media")).toBe(true);
  });

  it("does not contain malicious bucket names", () => {
    expect(ALLOWED_BUCKETS.has("admin")).toBe(false);
    expect(ALLOWED_BUCKETS.has("../etc")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S3Client factory
// ---------------------------------------------------------------------------

describe("getR2Client", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
  });

  it("throws when R2_ACCOUNT_ID is missing", () => {
    delete process.env.R2_ACCOUNT_ID;
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    expect(() => getR2Client()).toThrow("R2 non configuré");
  });

  it("throws when R2_ACCESS_KEY_ID is missing", () => {
    process.env.R2_ACCOUNT_ID = "acc";
    delete process.env.R2_ACCESS_KEY_ID;
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    expect(() => getR2Client()).toThrow("R2 non configuré");
  });

  it("creates client when all env vars present", () => {
    process.env.R2_ACCOUNT_ID = "acc123";
    process.env.R2_ACCESS_KEY_ID = "key123";
    process.env.R2_SECRET_ACCESS_KEY = "secret123";
    getR2Client();
    expect(S3Client).toHaveBeenCalledWith({
      region: "auto",
      endpoint: "https://acc123.r2.cloudflarestorage.com",
      credentials: {
        accessKeyId: "key123",
        secretAccessKey: "secret123",
      },
    });
  });
});

// ---------------------------------------------------------------------------
// createPresignedUploadUrl
// ---------------------------------------------------------------------------

describe("createPresignedUploadUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    vi.clearAllMocks();
    process.env = { ...originalEnv };
    process.env.R2_ACCOUNT_ID = "acc";
    process.env.R2_ACCESS_KEY_ID = "key";
    process.env.R2_SECRET_ACCESS_KEY = "secret";
    process.env.R2_BUCKET_NAME = "test-bucket";
    process.env.R2_PUBLIC_URL = "https://pub-test.r2.dev";
  });

  it("returns key, signedUrl, and publicUrl", async () => {
    const result = await createPresignedUploadUrl("user123/img.jpg", "image/jpeg");

    expect(result.key).toBe("user123/img.jpg");
    expect(result.signedUrl).toBe("https://r2.example.com/signed-upload");
    expect(result.publicUrl).toBe("https://pub-test.r2.dev/user123/img.jpg");
  });

  it("calls getSignedUrl with PutObjectCommand", async () => {
    await createPresignedUploadUrl("user123/img.jpg", "image/jpeg");

    expect(getSignedUrl).toHaveBeenCalledTimes(1);
    const [, command, options] = (getSignedUrl as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(command.input).toEqual({
      Bucket: "test-bucket",
      Key: "user123/img.jpg",
      ContentType: "image/jpeg",
    });
    expect(options.expiresIn).toBe(600);
  });

  it("throws when R2_BUCKET_NAME is missing", async () => {
    delete process.env.R2_BUCKET_NAME;
    await expect(createPresignedUploadUrl("key", "image/jpeg")).rejects.toThrow("R2_BUCKET_NAME");
  });
});

// ---------------------------------------------------------------------------
// buildPublicUrl
// ---------------------------------------------------------------------------

describe("buildPublicUrl", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  it("builds URL from key and R2_PUBLIC_URL", () => {
    process.env.R2_PUBLIC_URL = "https://pub-test.r2.dev";
    expect(buildPublicUrl("user123/img.jpg")).toBe("https://pub-test.r2.dev/user123/img.jpg");
  });

  it("strips trailing slash from base URL", () => {
    process.env.R2_PUBLIC_URL = "https://pub-test.r2.dev/";
    expect(buildPublicUrl("user123/img.jpg")).toBe("https://pub-test.r2.dev/user123/img.jpg");
  });

  it("throws when R2_PUBLIC_URL is missing", () => {
    delete process.env.R2_PUBLIC_URL;
    expect(() => buildPublicUrl("key")).toThrow("R2_PUBLIC_URL");
  });
});

// ---------------------------------------------------------------------------
// buildUploadPath
// ---------------------------------------------------------------------------

describe("buildUploadPath", () => {
  it("returns userId/uuid.ext format", () => {
    const path = buildUploadPath("user-123", "image/jpeg");
    expect(path).toMatch(/^user-123\/[a-f0-9-]+\.jpg$/);
  });

  it("maps video/mp4 to mp4", () => {
    const path = buildUploadPath("user-123", "video/mp4");
    expect(path).toMatch(/\.mp4$/);
  });

  it("maps audio/webm to webm", () => {
    const path = buildUploadPath("user-123", "audio/webm");
    expect(path).toMatch(/\.webm$/);
  });

  it("maps video/quicktime to mov", () => {
    const path = buildUploadPath("user-123", "video/quicktime");
    expect(path).toMatch(/\.mov$/);
  });

  it("maps audio/mpeg to mp3", () => {
    const path = buildUploadPath("user-123", "audio/mpeg");
    expect(path).toMatch(/\.mp3$/);
  });

  it("maps audio/wav to wav", () => {
    const path = buildUploadPath("user-123", "audio/wav");
    expect(path).toMatch(/\.wav$/);
  });

  it("maps video/webm to webm (not mp4)", () => {
    const path = buildUploadPath("user-123", "video/webm");
    expect(path).toMatch(/\.webm$/);
    expect(path).not.toMatch(/\.mp4$/);
  });

  it("handles normalized types with codecs param", () => {
    const p1 = buildUploadPath("user-123", "audio/webm;codecs=opus");
    expect(p1).toMatch(/\.webm$/);
    const p2 = buildUploadPath("user-123", "video/webm;codecs=vp8");
    expect(p2).toMatch(/\.webm$/);
    const p3 = buildUploadPath("user-123", "video/webm;codecs=vp8,opus");
    expect(p3).toMatch(/\.webm$/);
  });

  it("is case-insensitive via normalization", () => {
    const path = buildUploadPath("user-123", "VIDEO/MP4");
    expect(path).toMatch(/\.mp4$/);
    const path2 = buildUploadPath("user-123", "Audio/MPEG");
    expect(path2).toMatch(/\.mp3$/);
  });

  it("trims whitespace via normalization", () => {
    const path = buildUploadPath("user-123", "  audio/webm ; codecs=opus  ");
    expect(path).toMatch(/\.webm$/);
  });

  it("throws for unknown content type", () => {
    expect(() => buildUploadPath("user-123", "application/pdf")).toThrow(
      "Type de contenu non autorisé",
    );
  });

  it("throws for disallowed type even with codecs param", () => {
    expect(() => buildUploadPath("user-123", "application/pdf;codecs=opus")).toThrow(
      "Type de contenu non autorisé",
    );
    expect(() => buildUploadPath("user-123", "text/html;codecs=vp8")).toThrow(
      "Type de contenu non autorisé",
    );
  });
});
