// @vitest-environment node
import { describe, it, expect, afterEach } from "vitest";
import { buildPublicUrl, isAllowedContentType, CONTENT_TYPE_EXT, ALLOWED_BUCKETS } from "@/lib/r2";

describe("r2 content types", () => {
  it("allows known media types", () => {
    expect(isAllowedContentType("image/jpeg")).toBe(true);
    expect(isAllowedContentType("video/webm")).toBe(true);
    expect(isAllowedContentType("audio/mp3")).toBe(true);
  });
  it("rejects unknown types", () => {
    expect(isAllowedContentType("text/html")).toBe(false);
    expect(isAllowedContentType("application/x-msdownload")).toBe(false);
  });
  it("maps to correct extensions", () => {
    expect(CONTENT_TYPE_EXT["image/png"]).toBe("png");
    expect(CONTENT_TYPE_EXT["audio/webm"]).toBe("webm");
  });
});

describe("r2 allowed buckets", () => {
  it("restricts to avatars and post-media", () => {
    expect(ALLOWED_BUCKETS.has("avatars")).toBe(true);
    expect(ALLOWED_BUCKETS.has("post-media")).toBe(true);
    expect(ALLOWED_BUCKETS.has("admin")).toBe(false);
  });
});

describe("buildPublicUrl", () => {
  const original = process.env.R2_PUBLIC_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.R2_PUBLIC_URL;
    else process.env.R2_PUBLIC_URL = original;
  });

  it("joins base and key without double slash", () => {
    process.env.R2_PUBLIC_URL = "https://pub-xxxx.r2.dev/";
    expect(buildPublicUrl("post-media/u1/a.jpg")).toBe(
      "https://pub-xxxx.r2.dev/post-media/u1/a.jpg",
    );
  });

  it("throws when R2_PUBLIC_URL is missing", () => {
    delete process.env.R2_PUBLIC_URL;
    expect(() => buildPublicUrl("x/y.jpg")).toThrow();
  });
});
