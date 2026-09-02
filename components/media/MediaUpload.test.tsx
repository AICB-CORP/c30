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

describe("<MediaUpload /> — video/audio normalization & inference", () => {
  it("uploads video/quicktime (mov) with normalized type", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("clip.mov", "video/quicktime"));

    expect(screen.queryByTestId("image-cropper-modal")).toBeNull();
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(presign).toBeDefined();
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      bucket: "post-media",
      contentType: "video/quicktime",
    });
    const put = fetchCalls.find((c) => c.url === "https://r2.example.com/signed");
    expect(put).toBeDefined();
    expect((put!.init!.headers as Record<string, string>)["Content-Type"]).toBe("video/quicktime");
  });

  it("uploads audio/mpeg (mp3) with normalized type", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("track.mp3", "audio/mpeg"));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "audio/mpeg",
    });
  });

  it("uploads audio/wav with normalized type", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("sound.wav", "audio/wav"));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "audio/wav",
    });
  });

  it("uploads video/webm and audio/webm with distinct normalized types", async () => {
    const onUploadedVideo = vi.fn();
    const { unmount } = render(<MediaUpload kind="video" onUploaded={onUploadedVideo} />);
    let input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("clip.webm", "video/webm"));
    await waitFor(() => expect(onUploadedVideo).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "video/webm",
    });
    cleanup();
    fetchCalls.length = 0;

    const onUploadedAudio = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploadedAudio} />);
    input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("note.webm", "audio/webm"));
    await waitFor(() => expect(onUploadedAudio).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "audio/webm",
    });
    // avoid double cleanup warning
    unmount;
  });

  it("normalizes audio/webm;codecs=opus to audio/webm before upload", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    // Simulate MediaRecorder mimeType with codecs param
    dispatchFileChange(input, makeFile("voice.webm", "audio/webm;codecs=opus"));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "audio/webm",
    });
    const put = fetchCalls.find((c) => c.url === "https://r2.example.com/signed");
    expect((put!.init!.headers as Record<string, string>)["Content-Type"]).toBe("audio/webm");
  });

  it("normalizes video/webm;codecs=vp8 to video/webm before upload", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("clip.webm", "video/webm;codecs=vp8"));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "video/webm",
    });
  });

  it("normalizes with uppercase and extra spaces around codecs", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("voice.webm", " Audio/WEBM; CODECS=opus "));

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "audio/webm",
    });
  });

  it("infers content-type from filename when file.type is empty (video .mov → video/quicktime)", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("clip.mov", "");
    // Force empty type (File constructor may coerce "", but ensure)
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "video/quicktime",
    });
  });

  it("infers content-type from filename when file.type is empty (audio .mp3 → audio/mpeg)", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("track.mp3", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);

    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));

    const presign = fetchCalls.find((c) => c.url === "/api/upload");
    expect(JSON.parse(presign!.init!.body!.toString())).toMatchObject({
      contentType: "audio/mpeg",
    });
  });

  it("infers .webm correctly depending on kind (video vs audio)", async () => {
    // video kind → video/webm
    const onUploadedVideo = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploadedVideo} />);
    let input = document.querySelector('input[type="file"]') as HTMLInputElement;
    let file = makeFile("clip.webm", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);
    await waitFor(() => expect(onUploadedVideo).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "video/webm",
    });
    cleanup();
    fetchCalls.length = 0;

    // audio kind → audio/webm
    const onUploadedAudio = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploadedAudio} />);
    input = document.querySelector('input[type="file"]') as HTMLInputElement;
    file = makeFile("note.webm", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);
    await waitFor(() => expect(onUploadedAudio).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "audio/webm",
    });
  });

  it("infers .wav and .ogg correctly when type is empty", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    let input = document.querySelector('input[type="file"]') as HTMLInputElement;
    let file = makeFile("sound.wav", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);
    await waitFor(() => expect(onUploaded).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "audio/wav",
    });
    cleanup();
    fetchCalls.length = 0;

    const onUploaded2 = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded2} />);
    input = document.querySelector('input[type="file"]') as HTMLInputElement;
    file = makeFile("track.ogg", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);
    await waitFor(() => expect(onUploaded2).toHaveBeenCalledTimes(1));
    expect(JSON.parse(fetchCalls.find((c) => c.url === "/api/upload")!.init!.body!.toString())).toMatchObject({
      contentType: "audio/ogg",
    });
  });

  it("shows error for unknown extension when type is empty", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const file = makeFile("file.unknownext", "");
    Object.defineProperty(file, "type", { value: "" });
    dispatchFileChange(input, file);

    await waitFor(() => {
      expect(screen.queryByText(/Type inconnu/)).toBeTruthy();
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("shows error for unsupported type like application/pdf", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, makeFile("doc.pdf", "application/pdf"));

    await waitFor(() => {
      expect(screen.queryByText(/Type non supporté/)).toBeTruthy();
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("rejects video files larger than 50 MB (MAX_RAW_MB) without uploading", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const huge = makeFile("big.mp4", "video/mp4", 1024);
    // Override size to 60 MB without allocating huge buffer
    Object.defineProperty(huge, "size", { value: 60 * 1024 * 1024 });

    dispatchFileChange(input, huge);

    await waitFor(() => {
      expect(screen.queryByText(/Trop lourd/)).toBeTruthy();
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("rejects audio files larger than 50 MB without uploading", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const huge = makeFile("big.mp3", "audio/mpeg", 1024);
    Object.defineProperty(huge, "size", { value: 55 * 1024 * 1024 });

    dispatchFileChange(input, huge);

    await waitFor(() => {
      expect(screen.queryByText(/Trop lourd/)).toBeTruthy();
    });
    expect(onUploaded).not.toHaveBeenCalled();
    expect(fetchCalls).toHaveLength(0);
  });

  it("sets busy state during video upload (input disabled, button shows …)", async () => {
    // Make fetch hang to observe busy state
    let resolvePresign!: (v: Response) => void;
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string, init?: RequestInit) => {
        fetchCalls.push({ url, init });
        if (url === "/api/upload") {
          return new Promise<Response>((res) => {
            resolvePresign = res;
          });
        }
        return new Response(null, { status: 200 });
      }) as unknown as typeof fetch,
    );

    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    const button = screen.getByRole("button") as HTMLButtonElement;
    dispatchFileChange(input, makeFile("clip.mp4", "video/mp4"));

    // Busy should be true immediately after dispatch
    await waitFor(() => {
      expect(input.disabled).toBe(true);
      expect(button.disabled).toBe(true);
      expect(button.textContent).toBe("…");
    });

    // Resolve fetch to let upload finish
    resolvePresign!(
      new Response(
        JSON.stringify({
          uploadPath: "user-123/abc.mp4",
          signedUrl: "https://r2.example.com/signed",
          publicUrl: "https://pub-test.r2.dev/user-123/abc.mp4",
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      ),
    );

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(1);
    });
    // After finish, busy should be false
    await waitFor(() => {
      expect(input.disabled).toBe(false);
      expect(button.disabled).toBe(false);
    });
  });

  it("processes a queue of 3 video files sequentially", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="video" onUploaded={onUploaded} multiple maxFiles={3} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, [
      makeFile("a.mp4", "video/mp4"),
      makeFile("b.mp4", "video/mp4"),
      makeFile("c.mp4", "video/mp4"),
    ]);

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(3);
    });
    expect(fetchCalls.filter((c) => c.url === "/api/upload")).toHaveLength(3);
    expect(fetchCalls.filter((c) => c.url === "https://r2.example.com/signed")).toHaveLength(3);
  });

  it("processes a queue of audio files with mixed types", async () => {
    const onUploaded = vi.fn();
    render(<MediaUpload kind="audio" onUploaded={onUploaded} multiple maxFiles={3} />);

    const input = document.querySelector('input[type="file"]') as HTMLInputElement;
    dispatchFileChange(input, [
      makeFile("a.mp3", "audio/mpeg"),
      makeFile("b.wav", "audio/wav"),
      makeFile("c.ogg", "audio/ogg"),
    ]);

    await waitFor(() => {
      expect(onUploaded).toHaveBeenCalledTimes(3);
    });
    const presigns = fetchCalls.filter((c) => c.url === "/api/upload");
    expect(presigns).toHaveLength(3);
    const bodies = presigns.map((c) => JSON.parse(c.init!.body!.toString()));
    expect(bodies[0]).toMatchObject({ contentType: "audio/mpeg" });
    expect(bodies[1]).toMatchObject({ contentType: "audio/wav" });
    expect(bodies[2]).toMatchObject({ contentType: "audio/ogg" });
  });
});
