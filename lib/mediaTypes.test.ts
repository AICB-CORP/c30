// @vitest-environment node
import { describe, it, expect } from "vitest";
import {
  CONTENT_TYPE_EXT,
  ALLOWED_CONTENT_TYPES,
  normalizeContentType,
  isAllowedContentType,
} from "./mediaTypes";

describe("CONTENT_TYPE_EXT", () => {
  it("contains exactly 23 entries", () => {
    expect(Object.keys(CONTENT_TYPE_EXT)).toHaveLength(23);
    expect(ALLOWED_CONTENT_TYPES.size).toBe(23);
  });

  it("maps image types correctly", () => {
    expect(CONTENT_TYPE_EXT["image/jpeg"]).toBe("jpg");
    expect(CONTENT_TYPE_EXT["image/png"]).toBe("png");
    expect(CONTENT_TYPE_EXT["image/gif"]).toBe("gif");
    expect(CONTENT_TYPE_EXT["image/webp"]).toBe("webp");
  });

  it("maps video types correctly", () => {
    expect(CONTENT_TYPE_EXT["video/mp4"]).toBe("mp4");
    expect(CONTENT_TYPE_EXT["video/webm"]).toBe("webm");
    expect(CONTENT_TYPE_EXT["video/quicktime"]).toBe("mov");
    expect(CONTENT_TYPE_EXT["video/ogg"]).toBe("ogv");
    expect(CONTENT_TYPE_EXT["video/mpeg"]).toBe("mpeg");
    expect(CONTENT_TYPE_EXT["video/x-msvideo"]).toBe("avi");
    expect(CONTENT_TYPE_EXT["video/x-matroska"]).toBe("mkv");
  });

  it("maps audio types correctly", () => {
    expect(CONTENT_TYPE_EXT["audio/webm"]).toBe("webm");
    expect(CONTENT_TYPE_EXT["audio/mp3"]).toBe("mp3");
    expect(CONTENT_TYPE_EXT["audio/mpeg"]).toBe("mp3");
    expect(CONTENT_TYPE_EXT["audio/ogg"]).toBe("ogg");
    expect(CONTENT_TYPE_EXT["audio/wav"]).toBe("wav");
    expect(CONTENT_TYPE_EXT["audio/x-wav"]).toBe("wav");
    expect(CONTENT_TYPE_EXT["audio/wave"]).toBe("wav");
    expect(CONTENT_TYPE_EXT["audio/mp4"]).toBe("mp4");
    expect(CONTENT_TYPE_EXT["audio/aac"]).toBe("aac");
    expect(CONTENT_TYPE_EXT["audio/flac"]).toBe("flac");
    expect(CONTENT_TYPE_EXT["audio/x-flac"]).toBe("flac");
  });

  it("video/webm maps to webm not mp4", () => {
    expect(CONTENT_TYPE_EXT["video/webm"]).toBe("webm");
    expect(CONTENT_TYPE_EXT["video/webm"]).not.toBe("mp4");
  });

  it("audio/mpeg maps to mp3", () => {
    expect(CONTENT_TYPE_EXT["audio/mpeg"]).toBe("mp3");
  });

  it("video/quicktime maps to mov", () => {
    expect(CONTENT_TYPE_EXT["video/quicktime"]).toBe("mov");
  });

  it("does not contain disallowed types", () => {
    expect(CONTENT_TYPE_EXT["application/pdf"]).toBeUndefined();
    expect(CONTENT_TYPE_EXT["text/html"]).toBeUndefined();
    expect(CONTENT_TYPE_EXT["audio/webm;codecs=opus"]).toBeUndefined();
  });
});

describe("ALLOWED_CONTENT_TYPES", () => {
  it("contains exactly 23 entries", () => {
    expect(ALLOWED_CONTENT_TYPES.size).toBe(23);
  });

  it("contains all keys from CONTENT_TYPE_EXT", () => {
    for (const key of Object.keys(CONTENT_TYPE_EXT)) {
      expect(ALLOWED_CONTENT_TYPES.has(key)).toBe(true);
    }
  });

  it("does not contain pdf or html", () => {
    expect(ALLOWED_CONTENT_TYPES.has("application/pdf")).toBe(false);
    expect(ALLOWED_CONTENT_TYPES.has("text/html")).toBe(false);
  });
});

describe("normalizeContentType", () => {
  it("lowercases the input", () => {
    expect(normalizeContentType("Audio/WEBM")).toBe("audio/webm");
    expect(normalizeContentType("VIDEO/MP4")).toBe("video/mp4");
    expect(normalizeContentType("Image/JPEG")).toBe("image/jpeg");
  });

  it("trims whitespace", () => {
    expect(normalizeContentType("  audio/webm  ")).toBe("audio/webm");
    expect(normalizeContentType("\tvideo/mp4\n")).toBe("video/mp4");
  });

  it("strips codecs param after semicolon", () => {
    expect(normalizeContentType("audio/webm;codecs=opus")).toBe("audio/webm");
    expect(normalizeContentType("video/webm;codecs=vp8")).toBe("video/webm");
    expect(normalizeContentType("video/webm;codecs=vp8,opus")).toBe("video/webm");
    expect(normalizeContentType("audio/webm; codecs=opus")).toBe("audio/webm");
    expect(normalizeContentType('video/mp4; codecs="avc1.42E01E"')).toBe("video/mp4");
  });

  it("handles multiple semicolons — only keeps first segment", () => {
    expect(normalizeContentType("audio/webm;codecs=opus;foo=bar")).toBe("audio/webm");
  });

  it("trims after stripping codecs param", () => {
    expect(normalizeContentType("audio/webm ; codecs=opus ")).toBe("audio/webm");
  });

  it("returns empty string for empty input", () => {
    expect(normalizeContentType("")).toBe("");
    expect(normalizeContentType("   ")).toBe("");
  });

  it("handles undefined / null via String coercion", () => {
    // @ts-expect-error testing runtime safety
    expect(normalizeContentType(undefined)).toBe("");
    // @ts-expect-error testing runtime safety
    expect(normalizeContentType(null)).toBe("");
  });

  it("handles string without param unchanged (after lowercase/trim)", () => {
    expect(normalizeContentType("audio/mpeg")).toBe("audio/mpeg");
    expect(normalizeContentType("video/quicktime")).toBe("video/quicktime");
  });
});

describe("isAllowedContentType", () => {
  it("returns true for core allowed types", () => {
    expect(isAllowedContentType("image/jpeg")).toBe(true);
    expect(isAllowedContentType("video/mp4")).toBe(true);
    expect(isAllowedContentType("audio/ogg")).toBe(true);
  });

  it("returns true for audio/mpeg (mp3)", () => {
    expect(isAllowedContentType("audio/mpeg")).toBe(true);
    expect(isAllowedContentType("audio/mp3")).toBe(true);
  });

  it("returns true for video/quicktime", () => {
    expect(isAllowedContentType("video/quicktime")).toBe(true);
  });

  it("returns true for audio/wav variants", () => {
    expect(isAllowedContentType("audio/wav")).toBe(true);
    expect(isAllowedContentType("audio/x-wav")).toBe(true);
    expect(isAllowedContentType("audio/wave")).toBe(true);
  });

  it("returns true for video/webm", () => {
    expect(isAllowedContentType("video/webm")).toBe(true);
  });

  it("returns true for audio/webm;codecs=opus (normalized)", () => {
    expect(isAllowedContentType("audio/webm;codecs=opus")).toBe(true);
  });

  it("returns true for video/webm;codecs=vp8 (normalized)", () => {
    expect(isAllowedContentType("video/webm;codecs=vp8")).toBe(true);
  });

  it("returns true for video/webm with comma codecs", () => {
    expect(isAllowedContentType("video/webm;codecs=vp8,opus")).toBe(true);
  });

  it("is case-insensitive", () => {
    expect(isAllowedContentType("Audio/MPEG")).toBe(true);
    expect(isAllowedContentType("VIDEO/QUICKTIME")).toBe(true);
    expect(isAllowedContentType("Audio/WEBM;CODECS=opus")).toBe(true);
  });

  it("trims whitespace", () => {
    expect(isAllowedContentType(" audio/mpeg ")).toBe(true);
    expect(isAllowedContentType("  video/webm;codecs=vp8  ")).toBe(true);
  });

  it("returns false for disallowed types", () => {
    expect(isAllowedContentType("application/pdf")).toBe(false);
    expect(isAllowedContentType("text/html")).toBe(false);
    expect(isAllowedContentType("")).toBe(false);
    expect(isAllowedContentType("image/svg+xml")).toBe(false);
  });

  it("returns false for disallowed types with codecs param", () => {
    expect(isAllowedContentType("application/pdf;codecs=opus")).toBe(false);
    expect(isAllowedContentType("text/html;codecs=vp8")).toBe(false);
  });

  it("returns false for partial matches", () => {
    expect(isAllowedContentType("audio")).toBe(false);
    expect(isAllowedContentType("video/")).toBe(false);
    expect(isAllowedContentType("audio/webm2")).toBe(false);
  });
});
