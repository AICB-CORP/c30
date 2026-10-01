// Regenerate app/favicon.ico and app/apple-icon.png from app/icon.svg.
// Usage: node scripts/generate-favicon.mjs
//
// Dev-only tooling — never part of the Next build. Uses sharp (explicit
// devDependency, budget zéro). Edit app/icon.svg, then re-run this script to
// refresh the committed .ico and apple-icon.png.
import { readFile, writeFile } from "node:fs/promises";
import sharp from "sharp";
import { buildIco } from "./lib/favicon-ico.mjs";

const SVG_PATH = "app/icon.svg";
const ICO_PATH = "app/favicon.ico";
const APPLE_ICON_PATH = "app/apple-icon.png";

const SIZES = [16, 32, 48];

const svg = await readFile(SVG_PATH);

const pngs = await Promise.all(SIZES.map((size) => sharp(svg).resize(size, size).png().toBuffer()));
const appleIcon = await sharp(svg).resize(180, 180).png().toBuffer();
const ico = buildIco(pngs.map((data, i) => ({ size: SIZES[i], data })));

// Both buffers are built before either file is written: a failure upstream
// never leaves the two assets out of sync.
await writeFile(APPLE_ICON_PATH, appleIcon);
await writeFile(ICO_PATH, ico);
