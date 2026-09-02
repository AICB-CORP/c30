/**
 * Smoke test for `<ImageCropper />`.
 *
 * `react-easy-crop` does heavy DOM-measurement on mount but it survives in
 * jsdom — we just check that the modal surfaces the expected affordances
 * (title, aspect presets, Recadrer / Annuler buttons) so we don't lock
 * ourselves into the internal behaviour of react-easy-crop. The cropping
 * algorithm itself lives in `lib/imageCrop.ts` and is fully tested there.
 */

import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import ImageCropper from "./ImageCropper";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("<ImageCropper />", () => {
  it("renders the modal with a French title", () => {
    render(
      <ImageCropper
        imageSrc="data:image/png;base64,AAAA"
        fileName="test.png"
        fileType="image/png"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("image-cropper-modal")).toBeTruthy();
    expect(screen.getByText(/Recadrer l'image/i)).toBeTruthy();
  });

  it("renders the four aspect presets", () => {
    render(
      <ImageCropper
        imageSrc="data:image/png;base64,AAAA"
        fileName="test.png"
        fileType="image/png"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    expect(screen.getByTestId("aspect-Libre")).toBeTruthy();
    expect(screen.getByTestId("aspect-1-1")).toBeTruthy();
    expect(screen.getByTestId("aspect-4-3")).toBeTruthy();
    expect(screen.getByTestId("aspect-16-9")).toBeTruthy();
  });

  it("disables the Recadrer button until a crop has been computed", () => {
    render(
      <ImageCropper
        imageSrc="data:image/png;base64,AAAA"
        fileName="test.png"
        fileType="image/png"
        onConfirm={() => {}}
        onCancel={() => {}}
      />,
    );
    const confirm = screen.getByTestId("crop-confirm") as HTMLButtonElement;
    expect(confirm.disabled).toBe(true);
  });

  it("invokes onCancel when the Annuler button is clicked", () => {
    const onCancel = vi.fn();
    render(
      <ImageCropper
        imageSrc="data:image/png;base64,AAAA"
        fileName="test.png"
        fileType="image/png"
        onConfirm={() => {}}
        onCancel={onCancel}
      />,
    );
    const cancelButton = screen.getByRole("button", { name: /Annuler/i });
    cancelButton.click();
    expect(onCancel).toHaveBeenCalledTimes(1);
  });
});
