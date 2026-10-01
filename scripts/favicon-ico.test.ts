// @vitest-environment node
import { Buffer } from "node:buffer";
import { describe, expect, it } from "vitest";
import { buildIco } from "./lib/favicon-ico.mjs";

/**
 * Deterministic fake PNG payload: `length` bytes filled with a repeating
 * pattern derived from `seed` (no randomness, stable across runs).
 */
function fakePng(length: number, seed: number): Buffer {
  const buf = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    buf[i] = (seed + i * 7) % 256;
  }
  return buf;
}

/** Reads the ICONDIRENTRY at its canonical position: 6 + 16 * index. */
function readEntry(ico: Buffer, index: number) {
  const at = 6 + 16 * index;
  return {
    width: ico.readUInt8(at),
    height: ico.readUInt8(at + 1),
    palette: ico.readUInt8(at + 2),
    reserved: ico.readUInt8(at + 3),
    planes: ico.readUInt16LE(at + 4),
    bpp: ico.readUInt16LE(at + 6),
    bytesInRes: ico.readUInt32LE(at + 8),
    imageOffset: ico.readUInt32LE(at + 12),
  };
}

describe("buildIco (ICO builder, PNG-embedded Vista+ format)", () => {
  describe("header (ICONDIR)", () => {
    it("writes a 6-byte ICONDIR with reserved=0 and type=1 (icon)", () => {
      const ico = buildIco([{ size: 16, data: fakePng(10, 1) }]);

      // reserved: uint16LE = 0 → bytes [0, 0]
      expect(ico.subarray(0, 2).equals(Buffer.from([0, 0]))).toBe(true);
      // type: uint16LE = 1 (icon) → bytes [1, 0] (little-endian)
      expect(ico.subarray(2, 4).equals(Buffer.from([1, 0]))).toBe(true);
      expect(ico.readUInt16LE(0)).toBe(0);
      expect(ico.readUInt16LE(2)).toBe(1);
    });

    it("writes the image count as a little-endian uint16 (bytes 4-5)", () => {
      for (const count of [1, 3, 255]) {
        const images = Array.from({ length: count }, (_, i) => ({
          size: 1,
          data: fakePng(4, i),
        }));
        const ico = buildIco(images);

        expect(ico[4]).toBe(count); // low byte
        expect(ico[5]).toBe(0); // high byte (count max = 255)
        expect(ico.readUInt16LE(4)).toBe(count);
      }
    });
  });

  describe("entries (ICONDIRENTRY)", () => {
    it("starts the first PNG payload exactly at 6 + 16 * count", () => {
      const png = fakePng(32, 7);
      const ico = buildIco([{ size: 16, data: png }]);

      expect(readEntry(ico, 0).imageOffset).toBe(6 + 16 * 1);
      expect(ico.subarray(6 + 16, 6 + 16 + 32).equals(png)).toBe(true);
    });

    it("writes width and height bytes with the 256 → 0 rule", () => {
      const ico = buildIco([
        { size: 1, data: fakePng(8, 1) },
        { size: 255, data: fakePng(8, 2) },
        { size: 256, data: fakePng(8, 3) },
      ]);

      expect(readEntry(ico, 0).width).toBe(1);
      expect(readEntry(ico, 0).height).toBe(1);
      expect(readEntry(ico, 1).width).toBe(255);
      expect(readEntry(ico, 1).height).toBe(255);
      // 0 means 256 in the ICO format
      expect(readEntry(ico, 2).width).toBe(0);
      expect(readEntry(ico, 2).height).toBe(0);
    });

    it("writes palette=0, reserved=0, planes=1 and bpp=32 on every entry", () => {
      const ico = buildIco([
        { size: 16, data: fakePng(16, 1) },
        { size: 48, data: fakePng(16, 2) },
      ]);

      for (const index of [0, 1]) {
        const entry = readEntry(ico, index);
        expect(entry.palette).toBe(0); // 0 = truecolor
        expect(entry.reserved).toBe(0);
        expect(entry.planes).toBe(1);
        expect(entry.bpp).toBe(32);
      }
    });

    it("writes bytesInRes = PNG length and imageOffset = 6 + 16*count + previous payloads", () => {
      const png16 = fakePng(137, 1);
      const png32 = fakePng(289, 2);
      const png48 = fakePng(511, 3);
      const ico = buildIco([
        { size: 16, data: png16 },
        { size: 32, data: png32 },
        { size: 48, data: png48 },
      ]);

      expect(readEntry(ico, 0).bytesInRes).toBe(137);
      expect(readEntry(ico, 1).bytesInRes).toBe(289);
      expect(readEntry(ico, 2).bytesInRes).toBe(511);

      const payloadsStart = 6 + 16 * 3; // 54
      expect(readEntry(ico, 0).imageOffset).toBe(payloadsStart); // 54
      expect(readEntry(ico, 1).imageOffset).toBe(payloadsStart + 137); // 191
      expect(readEntry(ico, 2).imageOffset).toBe(payloadsStart + 137 + 289); // 480
    });
  });

  describe("payloads", () => {
    it("passes PNG payloads through byte-identical at their declared offsets", () => {
      const pngs = [fakePng(137, 11), fakePng(289, 22), fakePng(511, 33)];
      const ico = buildIco([
        { size: 16, data: pngs[0] },
        { size: 32, data: pngs[1] },
        { size: 48, data: pngs[2] },
      ]);

      pngs.forEach((png, index) => {
        const { imageOffset, bytesInRes } = readEntry(ico, index);
        const embedded = ico.subarray(imageOffset, imageOffset + bytesInRes);

        expect(embedded.length).toBe(png.length);
        expect(Buffer.compare(embedded, png)).toBe(0);
      });
    });

    it("produces a total length of 6 + 16*count + sum(payload lengths)", () => {
      const pngs = [fakePng(1, 1), fakePng(255, 2), fakePng(1024, 3), fakePng(7, 4)];
      const ico = buildIco(pngs.map((data, i) => ({ size: (i + 1) * 8, data })));

      const expected = 6 + 16 * pngs.length + pngs.reduce((sum, png) => sum + png.length, 0);
      expect(ico.length).toBe(expected);
    });
  });

  describe("validation errors", () => {
    it("throws on an empty array", () => {
      expect(() => buildIco([])).toThrow("buildIco requires at least one image");
    });

    it("throws on more than 255 images", () => {
      const images = Array.from({ length: 256 }, () => ({
        size: 1,
        data: Buffer.alloc(4),
      }));

      expect(() => buildIco(images)).toThrow("buildIco supports at most 255 images");
    });

    it.each([0, 0.5, 257, -1])("throws on invalid size %s", (size) => {
      expect(() => buildIco([{ size, data: Buffer.alloc(4) }])).toThrow(
        `invalid icon size: ${size}`,
      );
    });
  });

  describe("realistic case: 16/32/48 favicon set", () => {
    it("builds a complete .ico with every entry field and offset precise", () => {
      const png16 = fakePng(137, 100);
      const png32 = fakePng(289, 200);
      const png48 = fakePng(511, 250);

      const ico = buildIco([
        { size: 16, data: png16 },
        { size: 32, data: png32 },
        { size: 48, data: png48 },
      ]);

      // Header: reserved=0, type=1 (icon), count=3 — all little-endian
      expect(ico.subarray(0, 6).equals(Buffer.from([0, 0, 1, 0, 3, 0]))).toBe(true);

      // Three 16-byte entries at offsets 6, 22 and 38
      expect(readEntry(ico, 0)).toEqual({
        width: 16,
        height: 16,
        palette: 0,
        reserved: 0,
        planes: 1,
        bpp: 32,
        bytesInRes: 137,
        imageOffset: 54,
      });
      expect(readEntry(ico, 1)).toEqual({
        width: 32,
        height: 32,
        palette: 0,
        reserved: 0,
        planes: 1,
        bpp: 32,
        bytesInRes: 289,
        imageOffset: 191,
      });
      expect(readEntry(ico, 2)).toEqual({
        width: 48,
        height: 48,
        palette: 0,
        reserved: 0,
        planes: 1,
        bpp: 32,
        bytesInRes: 511,
        imageOffset: 480,
      });

      // Payloads, back to back, byte-identical at their declared offsets
      expect(ico.subarray(54, 54 + 137).equals(png16)).toBe(true);
      expect(ico.subarray(191, 191 + 289).equals(png32)).toBe(true);
      expect(ico.subarray(480, 480 + 511).equals(png48)).toBe(true);

      // Round-trip sanity
      expect(ico.length).toBe(6 + 16 * 3 + 137 + 289 + 511); // 811
    });
  });
});
