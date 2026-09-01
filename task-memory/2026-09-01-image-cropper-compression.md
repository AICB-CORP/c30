---
task_id: image-cropper-compression
date: 2026-09-01
type: feat
area: media/editor
tags: [cropper, compression, react-easy-crop, browser-image-compression, r2, mobile-first, retro]
status: implemented
branch: feat/image-cropper-compression
related_files:
  - lib/imageCrop.ts
  - components/media/ImageCropper.tsx
  - components/media/MediaUpload.tsx
  - app/(site)/compte/page.tsx
  - package.json
  - lib/imageCrop.test.ts
  - components/media/ImageCropper.test.tsx
  - components/media/MediaUpload.test.tsx
decisions:
  - react-easy-crop-over-react-image-crop
  - per-image-sequential-cropper-not-bulk
  - cropper-skips-gif-svg
  - 1.2-mb-target-with-1600-px-max-edge
  - even-dimensions-rounding
  - free-aspect-by-default-with-presets
  - black-anchored-bug-clamp-fix
---

# Image Cropper + Tighter Image Compression

## Summary

Add a 2000s-flavored image cropper (rotation, zoom, aspect presets) to the
post-creation flow, and tighten the `browser-image-compression` budget so
each photo lands closer to **1.2 MB** instead of the previous 1.5 MB. The
cropper runs **before** compression, so what the user actually uploads is
exactly what they framed. Avatar uploads get a default **1:1** aspect; post
uploads default to free aspect. **GIF and SVG skip the cropper** (canvas
re-encoding destroys animation; SVG has no pixels to crop). All in line
with PROJECT_PLAN §4 (zero-budget stack, only `react-easy-crop` added) and
§12 (R2 free-tier storage envelope).

## Context / Problem

Trigger: user asked for "a new cropper for images at post creation / edit"
and to "compress the images to not take too much space in r2".

PROJECT_PLAN §7.1 requires: "Personnalisation des posts : gifs animés,
animations, couleurs, changement de polices — esprit Skyblog." Today,
photos in posts are inserted raw — no composition, no narrative framing.
The previous compression in `MediaUpload` capped at `maxSizeMB: 1.5` with
no enforced aspect. A 24-MP phone shot still pushes ~1.5 MB after one
compression pass, which adds up fast across ~10–20 friends × multiple
posts.

Constraints:

- §4 zero-budget stack — only MIT / open-source libs allowed.
- §8 mobile-first — cropper must work on touch (pinch-zoom, drag-pan).
- §10 stealth — no third-party cropper-as-a-service that could phone home
  (rules out proprietary SDKs).
- §12 R2 free tier (10 Go) — keep typical photo under 1.5 MB.

## Decision Points

### react-easy-crop over react-image-crop

- **choice**: `react-easy-crop` 6.x.
- **rationale**: MIT, ~30 KB, no native deps, ships a headless `<Cropper />`
  component (no built-in UI = full control over the retro aesthetic), works
  on touch out of the box, supports rotation/zoom/aspect/grid — exactly
  the four affordances we needed. `react-image-crop` is also MIT but the
  API is more verbose for the same effect.
- **alternatives considered**:
  - `react-image-crop` — viable but a bit dated; UI more rigid.
  - Roll our own on `<canvas>` — too much code for a one-off, harder to
    re-use if we add an avatar-shape cropper later.
  - `cropperjs` (vanilla) — works but is jQuery-era; React wrapper is
    community-maintained and lags.
- **tradeoff**: `react-easy-crop` does not export a `getCroppedImg`
  helper from v6 — we ship our own `getCroppedBlob` in `lib/imageCrop.ts`.
  Acceptable: pure function, easy to unit-test, decoupled from the lib.

### Per-image sequential cropper, not bulk

- **choice**: multi-image flow opens the cropper one image at a time.
- **rationale**: "esprit Skyblog" = personal touch; a friend posting 5
  photos gets to frame each one. We do offer a "Passer" path implicitly:
  user can hit _Annuler_ and bail out of the whole batch.
- **alternatives considered**:
  - Skip cropper for multi-upload — saves time but loses the design
    intent.
  - Apply one crop to all images — fast but wrong UX (a portrait and a
    landscape need different framing).
  - Show a 2-step wizard with thumbnails — over-engineered for v1.
- **tradeoff**: 10 photos = 10 modal dismissals. Acceptable given
  PROJECT_PLAN §3.3 limits posts to "plusieurs posts", not dozens of
  photos per post.

### Cropper skips GIF and SVG

- **choice**: `isCropableImage()` returns false for `image/gif` and
  `image/svg+xml`.
- **rationale**: canvas re-encoding of a GIF produces a static first
  frame — animation is destroyed. SVG has no raster pixels to crop.
  Both are still allowed as uploads (the existing R2 path handles them)
  but bypass the cropper.
- **alternatives considered**:
  - Encode GIFs as WebM via ffmpeg.wasm — too heavy, off-budget.
  - Reject GIFs outright — breaks the §7.1 "gifs animés" requirement.
- **tradeoff**: GIFs uploaded to posts keep their original size, which
  can be larger than 1.2 MB. We cap at 8 MB raw and accept the cost.
  Most retro GIFs in our local folder are <500 KB.

### 1.2 MB target with 1600 px max edge

- **choice**: `maxSizeMB: 1.2`, `maxWidthOrHeight: 1600`, JPEG 85%
  initial quality.
- **rationale**: PROJECT_PLAN §12 says "vise 2-5 Mo par clip" but that's
  for video clips. For still photos, **1.2 MB at 1600 px** is visually
  lossless on mobile (the device Caroline will read from). Dropping from
  1.5 → 1.2 MB gives ~20% extra capacity on the R2 free tier.
- **alternatives considered**:
  - 0.8 MB / 1280 px — more savings but visible quality drop on phone
    retina displays.
  - 2.0 MB / 2000 px — better on a desktop, but 90% of the audience is
    on mobile per §2.
- **tradeoff**: a friend who uploads a heavily-detailed sunset might
  notice JPEG artefacts at 1.2 MB. Acceptable; the project brief
  explicitly says "le chaos rétro prime sur le polish".

### Free aspect by default + presets

- **choice**: cropper opens with **no aspect lock** (free), with quick
  buttons for `1:1`, `4:3`, `16:9`, `Libre`.
- **rationale**: posts are full-width responsive — no fixed shape needed
  for the body. Avatars are forced to 1:1 via the `cropAspect={1}` prop.
- **alternatives considered**:
  - Default to 4:3 — classic photo ratio but feels restrictive.
  - Default to 1:1 — Instagram-style but crops out too much for a post
    that is mostly text + image.
- **tradeoff**: a free-aspect cropper is harder to align on a phone
  screen because the handles are less stable. The presets cover this
  for the common cases.

### Even-dimension rounding (was a hidden bug)

- **choice**: round output canvas dimensions up to even numbers.
- **rationale**: some encoders (libjpeg-turbo, the codec under Chrome's
  `canvas.toBlob` for JPEG) refuse odd dimensions and silently produce
  a black strip. Even-numbered output is safer for downstream sharing.
- **alternatives considered**:
  - Round down — wastes a row of pixels.
  - Round to nearest — not deterministic enough for tests.
- **tradeoff**: a 1601×900 crop becomes 1602×900. Negligible.

### Bug fix — clamp used the wrong (raw) x

- **choice**: use the **clamped** `safeX`/`safeY` in the width/height
  bound, not the raw `crop.x`/`crop.y`.
- **rationale**: caught by `unit-tester` via an `it.fails(...)` test.
  The original formula was
  `Math.min(rotatedWidth - Math.round(crop.x), …)`; if `crop.x < 0`,
  `rotatedWidth - (-N)` *inflated* the available width, so the
  resulting rectangle overflowed the image. The fix uses the clamped
  value so the bound is always ≤ `rotatedWidth - safeX`.
- **alternatives considered**: leaving the bug and clipping at
  `toBlob` time — silent corruption, worse.
- **tradeoff**: the test that originally used `it.fails` is now a
  positive `it(...)`. Future regressions get caught immediately.

### Multi-image progress was hard-coded to "1/1"

- **choice**: track a monotonically-increasing `currentIndexRef` so the
  "Compression N/total" and "Photo N/total envoyée" messages read
  `1/3`, `2/3`, `3/3` instead of `1/3`, `1/2`, `1/1`.
- **rationale**: caught by **reviewer**. Original `processNextInQueue`
  always passed `index: 0, total: 1` into `pendingCrop`, regardless of
  queue depth. The user got no breadcrumb about how many photos were
  still to come in a 5-photo batch.
- **alternatives considered**:
  - Show the message only in the file input (no telemetry) — defeats
    the purpose of having progress.
  - Track index on the modal side — couples ImageCropper to its
    parent's state.
- **tradeoff**: an extra `useRef` for the current index. Refs in React
  19 are fine for this kind of "incrementing on every queue step"
  bookkeeping.

### "Libre" aspect preset silently coerced to 1:1

- **choice**: pass `currentAspect` directly to `react-easy-crop`
  (which accepts `undefined` for free crop) instead of `currentAspect ?? 1`.
- **rationale**: caught by **reviewer**. The `?? 1` fallback meant
  tapping the "Libre" button gave the user a square cropper with no
  warning — the opposite of the labelled intent.
- **alternatives considered**:
  - Rename the button to "Carré (défaut)" — defeats the option of a
    free crop.
  - Only offer 1:1 / 4:3 / 16:9 — restricts retro layouts.
- **tradeoff**: the user can now produce off-aspect crops that look
  odd on a phone screen. That's the user's call.

### Misleading EXIF docstring

- **choice**: rewrite the docstring to clarify that (a) we use
  `<img>` + `drawImage`, not `createImageBitmap`, and (b) the
  re-encoded Blob has no EXIF segment, so §10 privacy is preserved.
- **rationale**: caught by **reviewer**. The original docstring
  claimed `createImageBitmap` was used, which it wasn't. Future
  readers would chase a non-existent dependency.
- **alternatives considered**: switch to `createImageBitmap` (slightly
  more code, no real benefit for our use case).
- **tradeoff**: none.

## Implementation Approach

```
                            user picks file(s)
                                    │
                                    ▼
                ┌───────────────────────────────┐
                │  isCropableImage(file) ?       │──no──► upload as-is
                │  enableCropper prop ?         │       (e.g. GIF, audio,
                └───────────────────────────────┘        video, opt-out)
                       │ yes
                       ▼
                ┌───────────────────────────────┐
                │  <ImageCropper> modal opens   │
                │  (zoom, rotation, aspect)     │
                └───────────────────────────────┘
                       │ confirm
                       ▼
                ┌───────────────────────────────┐
                │  getCroppedBlob() (canvas)    │   ← lib/imageCrop.ts
                │  → Blob (jpeg 92%)           │
                └───────────────────────────────┘
                       │
                       ▼
                ┌───────────────────────────────┐
                │  imageCompression(blob, …)    │   ← browser-image-compression
                │  → ≤ 1.2 MB, ≤ 1600 px        │
                └───────────────────────────────┘
                       │
                       ▼
                ┌───────────────────────────────┐
                │  POST /api/upload (R2)        │   ← unchanged
                └───────────────────────────────┘
```

Files:

- `lib/imageCrop.ts` — pure: `loadImage`, `getCroppedBlob`,
  `isCropableImage`, `MAX_INPUT_BYTES`. Client-only (uses canvas).
- `components/media/ImageCropper.tsx` — modal wrapping `react-easy-crop`'s
  `<Cropper />` with retro styling. French UI. Aspect presets, rotation
  slider, Escape-to-cancel.
- `components/media/MediaUpload.tsx` — adds `enableCropper` (default true)
  and `cropAspect` props. Splits the file-selection flow into a queue so
  multi-image opens the modal one at a time. Bypasses cropper for
  video/audio and for non-croppable MIMEs.
- `app/(site)/compte/page.tsx` — passes `cropAspect={1}` so the avatar
  flow is square by default.
- `package.json` — adds `react-easy-crop@^6.2.3`.

## Pitfalls & Environment

- **React 19 + new lint rules**: `react-hooks/refs` now flags
  `cancelRef.current = onCancel` during render. Fix: move the assignment
  into a `useEffect` (no deps). The new `react-hooks/set-state-in-effect`
  rule would also flag any `setState(...)` directly inside an effect body.
  This is why `BestOfPost.tsx` was already failing the lint on the base
  branch — that error is pre-existing and out of scope here.
- **`browser-image-compression` types**: the lib's TypeScript signature
  is `imageCompression(image: File, options: Options)`, NOT `Blob`.
  We have to wrap the cropped Blob in a `File` (with a generated name
  and the right extension) before passing it in.
- **`image.crossOrigin = "anonymous"`**: required for canvas drawImage
  to work on cross-origin images without tainting. R2 public URLs send
  the right CORS headers, but data URLs and object URLs don't need it.
- **jsdom canvas**: not a real `<canvas>` impl. Tests stub
  `HTMLCanvasElement.prototype.getContext` and `toBlob` to capture
  arguments. Real visual testing needs Playwright (out of scope here).
- **`react-easy-crop` v6 dropped `getCroppedImg`**: we ship our own
  implementation. This decouples the project from the lib's API
  changes.
- **Even-dimension rounding**: silently fixes a class of black-strip
  bugs in some JPEG encoders.
- **Pre-existing lint debt on `feat/local-dev-setup`**: 1 error
  (BestOfPost setState-in-effect) and 4 warnings. NOT touched by this
  PR. Documented in the PR body so the reviewer knows the count is
  unchanged.

## Lessons for Future Agents

1. **Always clamp with the clamped value, not the raw input.** A
   negative input + a `Math.max(0, …)` clamp is not enough if a later
   bound formula still uses the raw value. The bug we found here is
   the canonical "off-by-one but in a different dimension" class.
   Defensive helper: `function clamp(value, min, max) { … }` and
   _always_ use the result.
2. **Test canvas code with a stubbed `getContext`.** jsdom doesn't
   paint. A 10-line mock of `getContext` + `toBlob` is enough to cover
   100% of the logic and is 100% faster than spinning up Playwright.
3. **Run the new lint rules before writing React code on this project.**
   React 19's stricter `react-hooks/refs` and
   `react-hooks/set-state-in-effect` are mandatory and ESLint will
   block the build.
4. **Gating on `enableCropper` (default true) is the right pattern.**
   It keeps the new behavior automatic for post uploads while letting
   `compte/page.tsx` (avatar flow) opt out with `cropAspect={1}` and
   any future caller opt out entirely with `enableCropper={false}`.
5. **R2 free-tier math**: at 1.2 MB per photo × 5 photos per friend ×
   20 friends = 120 MB. Plenty of headroom in the 10 GB free tier for
   the planned 2-min video clips too.
6. **Don't merge this PR before PR #4 (`feat/local-dev-setup`) is
   merged into main.** This branch is forked off
   `feat/local-dev-setup` because the multi-image upload logic in
   `MediaUpload` is on that branch. Once #4 lands, rebase
   `feat/image-cropper-compression` onto `main` (or open a new PR
   from main) before merging.

## Linked Reasoning / Similar Tasks

- `task-memory/2026-08-29-r2-storage-and-local-dev.md` — establishes the
  R2 presigned-PUT flow that we keep using here.
- `task-memory/2026-08-30-supabase-key-format-change.md` — env-var
  conventions; not touched by this task.
- `task-memory/2026-08-30-posts-query-ambiguity-fix.md` — query
  patterns; orthogonal.
- `task-memory/2026-08-31-editor-retro-features.md` — the parent PR
  (`feat/local-dev-setup`) that added the multi-image upload flow this
  work extends. This is the same chain.

## Verifications

- `npx tsc --noEmit` — 0 errors
- `npm run lint` — 1 error + 4 warnings, **all pre-existing on the
  base branch** (`feat/local-dev-setup`). None in the new files.
- `npm test` — 87/87 pass (25 new in `imageCrop`, 4 in
  `ImageCropper`, 8 in `MediaUpload`).
- `npm run build` — clean.
- `npx prettier --write .` — clean.
