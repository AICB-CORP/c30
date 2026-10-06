// Pure ICO builder — PNG-embedded format (Vista+), supported by all modern
// browsers and Safari. Extracted from scripts/generate-favicon.mjs so it can
// be unit-tested (scripts/favicon-ico.test.ts) without touching the filesystem.
//
// Layout: 6-byte ICONDIR + one 16-byte ICONDIRENTRY per image, then the PNG
// payloads back to back.

/**
 * @param {Array<{ size: number, data: Uint8Array | Buffer }>} images
 *        One entry per embedded icon, each a PNG buffer at `size`x`size`.
 * @returns {Buffer} The complete .ico file.
 */
export function buildIco(images) {
  if (images.length === 0) {
    throw new Error("buildIco requires at least one image");
  }
  if (images.length > 255) {
    throw new Error("buildIco supports at most 255 images");
  }

  const entries = [];
  let offset = 6 + 16 * images.length;
  images.forEach(({ size, data }) => {
    if (!Number.isInteger(size) || size < 1 || size > 256) {
      throw new Error(`invalid icon size: ${size}`);
    }
    const entry = Buffer.alloc(16);
    entry.writeUInt8(size === 256 ? 0 : size, 0); // width (0 = 256)
    entry.writeUInt8(size === 256 ? 0 : size, 1); // height
    entry.writeUInt8(0, 2); // palette colors (0 = truecolor)
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // color planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(data.length, 8); // image size in bytes
    entry.writeUInt32LE(offset, 12); // image offset from file start
    offset += data.length;
    entries.push(entry);
  });

  return Buffer.concat([
    // ICONDIR: reserved=0, type=1 (icon), count (little-endian)
    Buffer.from([0, 0, 1, 0, images.length, 0]),
    ...entries,
    ...images.map(({ data }) => data),
  ]);
}
