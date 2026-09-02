/**
 * Tests for `lib/imageCrop.ts` — the pure, dependency-free image cropping
 * helper used by `<ImageCropper />`.
 *
 * jsdom does not implement a real canvas, so we stub
 * `HTMLCanvasElement.prototype.toBlob` and `getContext` to drive the
 * algorithm deterministically. We also stub the global `Image` constructor
 * so `loadImage` can be triggered with controlled `onload` / `onerror`.
 */

import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";
import {
  getCroppedBlob,
  isCropableImage,
  loadImage,
  MAX_INPUT_BYTES,
  type CropRect,
} from "./imageCrop";

// ---------------------------------------------------------------------------
// Stub setup
// ---------------------------------------------------------------------------

/** A minimal 2D-context mock that records the calls we care about. */
function makeMockContext(): {
  ctx: CanvasRenderingContext2D;
  calls: {
    translate: Array<[number, number]>;
    rotate: Array<[number]>;
    scale: Array<[number, number]>;
    drawImage: Array<unknown[]>;
  };
} {
  const calls = {
    translate: [] as Array<[number, number]>,
    rotate: [] as Array<[number]>,
    scale: [] as Array<[number, number]>,
    drawImage: [] as Array<unknown[]>,
  };
  const ctx = {
    translate: (x: number, y: number) => {
      calls.translate.push([x, y]);
    },
    rotate: (r: number) => {
      calls.rotate.push([r]);
    },
    scale: (sx: number, sy: number) => {
      calls.scale.push([sx, sy]);
    },
    drawImage: (...args: unknown[]) => {
      calls.drawImage.push(args);
    },
  } as unknown as CanvasRenderingContext2D;
  return { ctx, calls };
}

const createdCanvases: Array<{
  width: number;
  height: number;
  calls: ReturnType<typeof makeMockContext>["calls"];
}> = [];

let toBlobImpl: (cb: (b: Blob | null) => void, type?: string, quality?: number) => void = (cb) =>
  cb(makeBlob("image/jpeg", 1024));

function makeBlob(type: string, size: number): Blob {
  return new Blob([new Uint8Array(size)], { type });
}

beforeEach(() => {
  createdCanvases.length = 0;

  // Each canvas we create gets its own recorded context so we can assert
  // width/height + drawImage calls per canvas.
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function (
    this: HTMLCanvasElement,
  ) {
    const { ctx, calls } = makeMockContext();
    createdCanvases.push({
      width: this.width,
      height: this.height,
      calls,
    });
    return ctx;
  });

  vi.spyOn(HTMLCanvasElement.prototype, "toBlob").mockImplementation(function (
    this: HTMLCanvasElement,
    cb: (b: Blob | null) => void,
    type?: string,
    quality?: number,
  ) {
    toBlobImpl(cb, type, quality);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Image stubbing for loadImage()
// ---------------------------------------------------------------------------

type FakeImage = {
  crossOrigin: string | null;
  src: string;
  naturalWidth: number;
  naturalHeight: number;
  onload: (() => void) | null;
  onerror: (() => void) | null;
};

const fakeImages: FakeImage[] = [];

function installImageStub(): void {
  fakeImages.length = 0;
  // jsdom's Image does fire onload on data URLs sometimes; we override it
  // entirely so the test is fully deterministic.
  vi.stubGlobal(
    "Image",
    class {
      crossOrigin: string | null = null;
      src = "";
      naturalWidth = 100;
      naturalHeight = 100;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      constructor() {
        fakeImages.push(this);
      }
    },
  );
}

// ---------------------------------------------------------------------------
// isCropableImage
// ---------------------------------------------------------------------------

describe("isCropableImage", () => {
  it("returns true for image/jpeg", () => {
    expect(isCropableImage(new File([], "a.jpg", { type: "image/jpeg" }))).toBe(true);
  });

  it("returns true for image/png", () => {
    expect(isCropableImage(new File([], "a.png", { type: "image/png" }))).toBe(true);
  });

  it("returns true for image/webp", () => {
    expect(isCropableImage(new File([], "a.webp", { type: "image/webp" }))).toBe(true);
  });

  it("returns true for image/bmp", () => {
    expect(isCropableImage(new File([], "a.bmp", { type: "image/bmp" }))).toBe(true);
  });

  it("returns false for image/gif (animation would be destroyed)", () => {
    expect(isCropableImage(new File([], "a.gif", { type: "image/gif" }))).toBe(false);
  });

  it("returns false for image/svg+xml (vector, no raster pixels)", () => {
    expect(isCropableImage(new File([], "a.svg", { type: "image/svg+xml" }))).toBe(false);
  });

  it("returns false for non-image MIME", () => {
    expect(isCropableImage(new File([], "a.pdf", { type: "application/pdf" }))).toBe(false);
  });

  it("returns false for empty MIME", () => {
    expect(isCropableImage(new File([], "a", { type: "" }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MAX_INPUT_BYTES
// ---------------------------------------------------------------------------

describe("MAX_INPUT_BYTES", () => {
  it("is 50 MB", () => {
    expect(MAX_INPUT_BYTES).toBe(50 * 1024 * 1024);
  });
});

// ---------------------------------------------------------------------------
// loadImage
// ---------------------------------------------------------------------------

describe("loadImage", () => {
  it("resolves with the HTMLImageElement on success", async () => {
    installImageStub();
    const p = loadImage("data:image/png;base64,AAAA");
    const img = fakeImages[0];
    expect(img).toBeDefined();
    // Simulate the browser firing onload after src is set.
    img!.naturalWidth = 200;
    img!.naturalHeight = 150;
    img!.onload!();
    await expect(p).resolves.toBeDefined();
  });

  it("sets crossOrigin to anonymous (for tainted-canvas safety)", async () => {
    installImageStub();
    const p = loadImage("data:image/png;base64,AAAA");
    expect(fakeImages[0]!.crossOrigin).toBe("anonymous");
    // resolve to avoid an unhandled rejection
    fakeImages[0]!.onload!();
    await p;
  });

  it("rejects with a French error message when the image fails to load", async () => {
    installImageStub();
    const p = loadImage("http://broken.example/missing.png");
    fakeImages[0]!.onerror!();
    await expect(p).rejects.toThrow(/Impossible de charger l'image/);
  });
});

// ---------------------------------------------------------------------------
// getCroppedBlob
// ---------------------------------------------------------------------------

describe("getCroppedBlob", () => {
  beforeEach(() => {
    installImageStub();
    // Default: toBlob yields a JPEG blob of 1024 bytes
    toBlobImpl = (cb, type) => cb(makeBlob(type ?? "image/jpeg", 1024));
  });

  function fireLoadForSrc(_src: string, w = 100, h = 100) {
    const img = fakeImages[fakeImages.length - 1];
    img!.naturalWidth = w;
    img!.naturalHeight = h;
    img!.onload!();
  }

  it("returns a Blob with the requested MIME type", async () => {
    toBlobImpl = (cb, type) => cb(makeBlob(type ?? "image/jpeg", 2048));
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 50, height: 50 },
      outputType: "image/png",
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    const { blob } = await p;
    expect(blob).toBeInstanceOf(Blob);
    expect(blob.type).toBe("image/png");
  });

  it("defaults to image/jpeg when outputType is omitted", async () => {
    toBlobImpl = (cb, type) => cb(makeBlob(type ?? "image/jpeg", 1024));
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 50, height: 50 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    const { blob } = await p;
    expect(blob.type).toBe("image/jpeg");
  });

  it("rounds output dimensions up to even numbers", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 51, height: 33 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    const { width, height } = await p;
    expect(width).toBe(52);
    expect(height).toBe(34);
    expect(width % 2).toBe(0);
    expect(height % 2).toBe(0);
  });

  // Regression guard: when the crop origin is negative, the clamp must use
  // the clamped x/y (not the raw value), otherwise the available width
  // inflates and the resulting rectangle overflows the image.
  it("clamps a crop rectangle that overflows the image bounds", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: -10, y: -10, width: 9999, height: 9999 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 80, 60);
    const { width, height } = await p;
    // Source is 80x60 → clamped to (80, 60), then rounded up to even (80, 60)
    expect(width).toBe(80);
    expect(height).toBe(60);
  });

  it("clamps negative crop origin to (0, 0)", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: -50, y: -50, width: 30, height: 30 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    const { width, height } = await p;
    expect(width).toBe(30);
    expect(height).toBe(30);
  });

  it("swaps width/height on the intermediate canvas when rotation is 90°", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 100, height: 100 },
      rotation: 90,
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 200, 100);
    await p;
    // First canvas drawn into is the rotated one (rotatedWidth = 100,
    // rotatedHeight = 200 — height and width are swapped)
    expect(createdCanvases[0]!.width).toBe(100);
    expect(createdCanvases[0]!.height).toBe(200);
    // rotate() was called with the radian-equivalent of 90°
    expect(createdCanvases[0]!.calls.rotate[0]?.[0]).toBeCloseTo(Math.PI / 2);
  });

  it("does NOT swap width/height when rotation is 180°", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 100, height: 100 },
      rotation: 180,
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 200, 100);
    await p;
    expect(createdCanvases[0]!.width).toBe(200);
    expect(createdCanvases[0]!.height).toBe(100);
  });

  it("applies horizontal flip via ctx.scale(-1, 1)", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 50, height: 50 },
      flipHorizontal: true,
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    await p;
    const firstCanvas = createdCanvases[0]!;
    expect(firstCanvas.calls.scale).toContainEqual([-1, 1]);
  });

  it("forwards outputQuality to toBlob", async () => {
    const seen: Array<{ type?: string; quality?: number }> = [];
    toBlobImpl = (cb, type, quality) => {
      seen.push({ type, quality });
      cb(makeBlob(type ?? "image/jpeg", 1024));
    };
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 50, height: 50 },
      outputType: "image/webp",
      outputQuality: 0.42,
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    await p;
    expect(seen).toHaveLength(1);
    expect(seen[0]!.type).toBe("image/webp");
    expect(seen[0]!.quality).toBe(0.42);
  });

  it("rejects when toBlob yields null", async () => {
    toBlobImpl = (cb) => cb(null);
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 0, y: 0, width: 50, height: 50 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    await expect(p).rejects.toThrow(/Échec encodage/);
  });

  it("rejects when loadImage fails", async () => {
    const p = getCroppedBlob({
      imageSrc: "http://broken.example/missing.png",
      crop: { x: 0, y: 0, width: 50, height: 50 },
    });
    fakeImages[fakeImages.length - 1]!.onerror!();
    await expect(p).rejects.toThrow(/Impossible de charger l'image/);
  });

  it("draws the clamped crop rectangle into the output canvas", async () => {
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop: { x: 10, y: 5, width: 40, height: 30 },
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 80, 60);
    await p;
    // The output canvas is the 2nd one created.
    const output = createdCanvases[1]!;
    expect(output.calls.drawImage).toHaveLength(1);
    const args = output.calls.drawImage[0]!;
    // drawImage(srcCanvas, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight)
    expect(args[1]).toBe(10); // clamped x
    expect(args[2]).toBe(5); // clamped y
    expect(args[3]).toBe(40); // clamped width
    expect(args[4]).toBe(30); // clamped height
    expect(args[7]).toBe(40); // even-rounded output width
    expect(args[8]).toBe(30); // even-rounded output height
  });

  it("returns width and height matching the output canvas size", async () => {
    const crop: CropRect = { x: 0, y: 0, width: 17, height: 23 };
    const p = getCroppedBlob({
      imageSrc: "data:image/png;base64,AAAA",
      crop,
    });
    fireLoadForSrc("data:image/png;base64,AAAA", 100, 100);
    const { width, height } = await p;
    expect(width).toBe(18);
    expect(height).toBe(24);
  });
});
