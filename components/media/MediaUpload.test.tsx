/**
 * Tests for `<MediaUpload />` — cropper-gating behaviour.
 *
 * The cropper logic is the only non-trivial change here:
 *   - croppable images (jpeg/png/webp/bmp) and `enableCropper !== false`
 *     → modal opens, upload is gated until cropper confirms
 *   - GIFs (canvas destroys animation) → cropper skipped, straight upload
 *   - videos / audios → cropper skipped, straight upload
 *   - `enableCropper={false}` → cropper skipped regardless of MIME
 *
 * We mock `browser-image-compression` (uses Web Workers — incompatible
 * with jsdom) and stub `URL.createObjectURL` / `revokeObjectURL` for
 * deterministic object URLs. `fetch` is mocked to drive the upload
 * pipeline through to completion.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { render, screen, fireEvent, cleanup, waitFor } from "@testing-library/react";

// `browser-image-compression` relies on Web Workers — pass through.
vi.mock("browser-image-compression", () => ({
  default: vi.fn(async (file: File) => file),
}));

// `ImageCropper` pulls in `react-easy-crop` (heavy DOM measurement).
// We replace it with a stub that just exposes the testid + onConfirm /
// onCancel fire-hose so we can still drive the parent component's
// pendingCrop state machine end-to-end. We do NOT install a click handler
// on the wrapping element (would swallow bubbled clicks from the children
// and fire onConfirm even when the test asks for cancel).
vi.mock("./ImageCropper", () => ({
  default: vi.fn(
    (props: { onConfirm: (blob: Blob, name: string) => void; onCancel: () => void }) => {
      return (
        <div data-testid="image-cropper-modal">
          <button
            data-testid="cropper-confirm"
            type="button"
            onClick={() =>
              props.onConfirm(new Blob([new Uint8Array(8)], { type: "image/jpeg" }), "cropped.jpg")
            }
          >
            Confirm
          </button>
          <button data-testid="cropper-cancel" type="button" onClick={() => props.onCancel()}>
            Cancel
          </button>
        </div>
      );
    },
  ),
}));

// ---------------------------------------------------------------------------
// fetch + URL stubbing
// ---------------------------------------------------------------------------

const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

function setupFetchMock(): void {
  fetchCalls.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      fetchCalls.push({ url, init });
      if (url === "/api/upload") {
        return new Response(
          JSON.stringify({
            uploadPath: "user-123/abc.jpg",
            signedUrl: "https://r2.example.com/signed",
            publicUrl: "https://pub-test.r2.dev/user-123/abc.jpg",
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        );
      }
      if (url === "https://r2.example.com/signed") {
        return new Response(null, { status: 200 });
      }
      return new Response(null, { status: 404 });
    }) as unknown as typeof fetch,
  );
}

let objectUrlCounter = 0;
function setupUrlMock(): void {
  objectUrlCounter = 0;
  vi.stubGlobal(
    "URL",
    Object.assign(URL, {
      createObjectURL: () => `blob:fake-${++objectUrlCounter}`,
      revokeObjectURL: vi.fn(),
    }),
  );
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import MediaUpload from "./MediaUpload";

function makeFile(name: string, type: string, size = 1024): File {
  // File constructor requires at least one part. A Uint8Array ensures a
  // non-zero size we can assert on if needed.
  const bytes = new Uint8Array(size);
  return new File([bytes], name, { type });
}

function dispatchFileChange(input: HTMLInputElement, file: File | File[]): void {
  const files = Array.isArray(file) ? file : [file];
  Object.defineProperty(input, "files", {
    value: files,
    configurable: true,
  });
  fireEvent.change(input);
}

beforeEach(() => {
  setupFetchMock();
  setupUrlMock();
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("<MediaUpload /> — cropper gating", () => {
  it("opens the cropper modal for a croppable image (jpeg) and defers upload", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("photo.jpg", "image/jpeg"));

    // The cropper modal should appear…
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    // …and no upload should have happened yet (we haven't confirmed).
    expect(fetchCalls).toHaveLength(0);
    expect(onUploaded).not.toHaveBeenCalled();
  });

  it("opens the cropper modal for png / webp / bmp", async () => {
    const onUploaded = vi.fn();
    for (const type of ["image/png", "image/webp", "image/bmp"]) {
      cleanup();
      const { container } = render(<MediaUpload kind="image" onUploaded={onUploaded} />);
      const input = container.querySelector('input[type="file"]') as HTMLInputElement;
      dispatchFileChange(input, makeFile(`p.${type.slice(6)}`, type));
      await waitFor(() => {
        expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
      });
      expect(fetchCalls).toHaveLength(0);
    }
  });

  it("skips the cropper for a GIF (animation would be destroyed)", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("anim.gif", "image/gif"));

    // The cropper should NOT appear.
    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    // The upload pipeline should run end-to-end.
    await waitFor(() => {
      expect(fetchCalls.length).toBeGreaterThan(0);
    });
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledWith(
        "user-123/abc.jpg",
        "https://pub-test.r2.dev/user-123/abc.jpg",
      );
    });
    // Verify the upload request was signed for an image MIME.
    const presignCall = fetchCalls.find((c) => c.url === "/api/upload");
    expect(presignCall).toBeDefined();
    expect(JSON.parse(presignCall!.init!.body!.toString())).toMatchObject({
      bucket: "post-media",
    });
  });

  it("skips the cropper when enableCropper is false, even for jpeg", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" enableCropper={false} onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("photo.jpg", "image/jpeg"));

    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
  });

  it("skips the cropper for video uploads", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("clip.mp4", "video/mp4"));

    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
  });

  it("skips the cropper for audio uploads", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("note.webm", "audio/webm"));

    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
  });

  it("invokes the cropper confirm callback → triggers the upload pipeline", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("photo.jpg", "image/jpeg"));

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    expect(onUploaded).not.toHaveBeenCalled();

    // Click the stubbed cropper's "Confirm" button → should drive the upload.
    fireEvent.click(screen.getByTestId("cropper-confirm"));

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
    // The cropper modal should be gone after confirm.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    });
  });

  it("cancelling the cropper does NOT call onUploaded", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("photo.jpg", "image/jpeg"));

    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });

    fireEvent.click(screen.getByTestId("cropper-cancel"));

    // Give any microtasks a chance to run — no upload should happen.
    await new Promise((r) => setTimeout(r, 10));
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("processes a 3-image queue: confirms each cropper → 3 uploads", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, [
      makeFile("a.jpg", "image/jpeg"),
      makeFile("b.jpg", "image/jpeg"),
      makeFile("c.jpg", "image/jpeg"),
    ]);

    // Confirm 1st cropper.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("cropper-confirm"));
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });

    // 2nd cropper should re-open.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("cropper-confirm"));
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(2);
    });

    // 3rd cropper should re-open.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("cropper-confirm"));
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(3);
    });

    // After the last upload, the modal should be gone and the queue drained.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    });
    // 3 presign + 3 PUT = 6 fetch calls.
    expect(fetchCalls).toHaveLength(6);
    expect(fetchCalls.filter((c) => c.url === "/api/upload")).toHaveLength(3);
  });

  it("cancelling mid-batch drops the rest of the queue", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, [
      makeFile("a.jpg", "image/jpeg"),
      makeFile("b.jpg", "image/jpeg"),
      makeFile("c.jpg", "image/jpeg"),
    ]);

    // Confirm the 1st.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("cropper-confirm"));
    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });

    // Cancel the 2nd.
    await waitFor(() => {
      expect(screen.queryByTestId("image-cropper-modal")).toBeTruthy();
    });
    fireEvent.click(screen.getByTestId("cropper-cancel"));

    // Wait a beat — no further uploads should occur.
    await new Promise((r) => setTimeout(r, 20));
    expect(onUploaded).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
  });

  it("honours maxFiles when selecting more than the limit (rejects whole batch)", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" maxFiles={2} onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, [
      makeFile("a.jpg", "image/jpeg"),
      makeFile("b.jpg", "image/jpeg"),
      makeFile("c.jpg", "image/jpeg"),
    ]);

    // No cropper should open and no upload should run — the whole batch
    // is rejected to avoid "sorry, the last 3 were silently dropped".
    await new Promise((r) => setTimeout(r, 10));
    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("rejects files larger than MAX_INPUT_BYTES (50 MB) without uploading", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="image" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // 60 MB > 50 MB MAX_INPUT_BYTES cap.
    const huge = new File([new Uint8Array(60 * 1024 * 1024)], "huge.jpg", {
      type: "image/jpeg",
    });
    dispatchFileChange(input, huge);

    await new Promise((r) => setTimeout(r, 20));
    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    expect(fetchCalls).toHaveLength(0);
    expect(onUploaded).not.toHaveBeenCalled();
    expect(screen.queryByText(/Trop lourd/)).toBeTruthy();
  });
});
