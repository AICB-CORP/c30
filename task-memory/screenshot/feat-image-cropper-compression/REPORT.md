## Layout Test Report — 2026-09-01 (PR #5 `feat/image-cropper-compression`)

### Summary

- **Scope:** the new image-cropper modal (`components/media/ImageCropper.tsx`), its wiring into `RetroEditor.tsx` (post composer) and `compte/page.tsx` (avatar flow), plus the `MediaUpload` queue.
- **Pages / surfaces tested:** post editor toolbar (desktop + mobile), `/compte` avatar uploader (desktop + mobile), cropper modal at three viewport widths (1280×800 desktop, 375×812 iPhone, 360×800 narrowest mobile).
- **Total screenshots produced:** 10 (8 required + 2 bonus).
- **Verdict:** **REQUEST CHANGES** — no blocking bugs; one Important finding (toolbar touch targets < 44 px), the rest are Nits. The cropper itself is correctly built, the retro aesthetic is applied, no overflow at any tested viewport, the 1:1 avatar lock works, GIF bypass is verified, Escape-to-close works.

### Per-surface results

#### Post editor toolbar (homepage → ✏️ Écrire un post)

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| desktop (1280×800) | toolbar Photos button | PASS | "🖼️ Photos" button visible alongside Vidéo / Son / GIF / Voix |
| mobile (375×812) | toolbar Photos button | PASS | wraps cleanly; no overflow (`docScrollWidth = 375`) |
| mobile (360×800) | toolbar button heights | **FAIL (Important)** | 33 px tall — below 44 px iOS HIG minimum (pre-existing pattern across the whole toolbar, not introduced by this PR) |

Screenshots:

- `task-memory/screenshot/feat-image-cropper-compression/editor-toolbar-desktop.png`
- `task-memory/screenshot/feat-image-cropper-compression/editor-toolbar-mobile.png`

#### /compte avatar flow

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| desktop (1280×800) | avatar "🖼️ Photo" button | PASS | visible in the Avatar card; chosen-file UX intact |
| mobile (375×812) | avatar "🖼️ Photo" button | PASS | no overflow; layout single-column |
| any | single file input (no `multiple`) | PASS | only one `<input type="file">` present, `accept="image/*"` |

Screenshots:

- `task-memory/screenshot/feat-image-cropper-compression/compte-avatar-desktop.png`
- `task-memory/screenshot/feat-image-cropper-compression/compte-avatar-mobile.png`

#### Cropper modal — default (Libre / zoom 1 / rotation 0)

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| desktop (1280×800) | full modal | PASS | modal covers 1280×800 (overlay `bg-black/80`); retro-panel sits centred with `max-w-2xl`; 55 vh crop area |
| desktop (1280×800) | title "✂️ Recadrer l'image" | PASS | class `neon-pink` → 4-layer pink `text-shadow` (rgb(255,105,180) × rgb(255,20,147)) |
| desktop (1280×800) | crop area border | PASS | `2px dashed rgb(255, 20, 147)` — pink dashed as required |
| desktop (1280×800) | aspect presets Libre / 1:1 / 4:3 / 16:9 | PASS | all four buttons rendered with `data-testid="aspect-..."`; "Libre" highlighted by default |
| desktop (1280×800) | Zoom slider, Rotation slider | PASS | values `1` and `0` on mount; `accent-[var(--sky-hotpink)]` |
| desktop (1280×800) | "0°" reset | PASS | disabled until rotation ≠ 0 |
| desktop (1280×800) | Annuler / Recadrer buttons | PASS | 103×46 and 116×46 — well above 44 px |
| mobile (375×812) | full modal | PASS | modal = 375×812 (fills viewport), panel = 351 px wide (12 px margin each side) |
| mobile (375×812) | overflow check | PASS | `documentElement.scrollWidth = 375` — no horizontal scroll |
| mobile (375×812) | crop area | PASS | 323 px wide free-aspect at mobile |
| mobile (375×812) | aspect preset buttons | **FAIL (Important)** | 31 px tall — below 44 px iOS HIG minimum |
| mobile (375×812) | "0°" reset | **FAIL (Important)** | 31 px tall — below 44 px iOS HIG minimum |
| mobile (375×812) | Annuler / Recadrer | PASS | 46 px tall |
| narrow mobile (360×800) | full modal | PASS | panel wraps "16:9" to a second line (flex-wrap working) |
| narrow mobile (360×800) | overflow check | PASS | `documentElement.scrollWidth = 360` — no horizontal scroll |
| narrow mobile (360×800) | aspect preset heights | PARTIAL | 38 px (wrap reflow improves them); still < 44 px |

Screenshots:

- `task-memory/screenshot/feat-image-cropper-compression/cropper-default-desktop.png`
- `task-memory/screenshot/feat-image-cropper-compression/cropper-default-mobile.png`
- `task-memory/screenshot/feat-image-cropper-compression/cropper-360px.png` *(bonus — narrowest mobile width)*

#### Cropper modal — 1:1 preset (avatar flow lock)

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| mobile (375×812) | Libre → 1:1 click | PASS | crop area becomes 323×323 (perfect square) |
| mobile (375×812) | active preset | PASS | "1:1" button gains `tool-btn--active` class |
| desktop (1280×800) | opened from /compte | PASS | `cropAspect={1}` honored — active preset is "1:1" on mount, crop area is square |
| desktop (1280×800) | crop area (real 64×64 input) | PASS | crop box matches the source image dimensions (64×64) |

Screenshots:

- `task-memory/screenshot/feat-image-cropper-compression/cropper-aspect-1-1.png`
- `task-memory/screenshot/feat-image-cropper-compression/cropper-compte-avatar-1-1.png` *(bonus — proves avatar `cropAspect={1}`)*

#### Cropper modal — rotation

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| desktop (1280×800) | rotation slider @ 45° | PASS | image visibly rotated in the Cropper; crop area tracked the rotated image |

Screenshot:

- `task-memory/screenshot/feat-image-cropper-compression/cropper-rotation.png`

#### Modal escape / close behaviour

| Surface | Test | Status | Notes |
|---------|------|--------|-------|
| cropper modal | Escape key | PASS | modal unmounts; `cancelRef` correctly invokes `onCancel` and the parent shows "Recadrage annulé." feedback |
| cropper modal | "Annuler" button | PASS | visible (did not click — same code path as Escape) |
| cropper modal | "Recadrer" button | PASS | visible; disabled while `croppedAreaPixels` is null |

#### GIF / non-croppable upload bypass

| Surface | Test | Status | Notes |
|---------|------|--------|-------|
| /compte avatar uploader | GIF file (image/gif) | PASS | modal does NOT open — `isCropableImage()` correctly returns false and the GIF flows through `uploadSingleFile` untouched (per task spec point 6) |

### Retro aesthetic check (PROJECT_PLAN §8)

- [x] **Neon colors applied.** Title `neon-pink` class produces a 4-layer pink text-shadow. Crop container border `rgb(255, 20, 147)`, crop-area dashed border `2px dashed rgb(255, 20, 147)`, accent on sliders `var(--sky-hotpink)` = `#ff1493`.
- [x] **Skyblog "pink dashed border".** Verified at the rendered cropper layer (`cropAreaStyle.border` in `ImageCropper.tsx:139`).
- [x] **No marquee / blink / rainbow regressions in the modal.** The modal renders only the four retro primitives (neon-pink title, retro-panel wrapper, tool-btn styled buttons, pink sliders) — no rogue animations to break mobile.
- [x] **No GIFs needed to render the modal.** Modal renders independently of media loading state; the empty-jpeg path renders fine.
- [x] **Pixel/retro fonts.** Toolbar buttons inherit the project's `tool-btn` class which uses the project's retro font stack — visible in the "Libre / 1:1 / 4:3 / 16:9" labels and "0°" reset.
- [x] **"55 vh" container.** Confirmed via `relative h-[55vh] min-h-[260px] w-full overflow-hidden` (line 123 of `ImageCropper.tsx`).

### Findings — categorised

#### Blocking
*(none — cropper opens, displays, switches aspects, rotates, closes on Escape, honors 1:1 avatar lock, bypasses GIFs, no overflow at any tested width)*

#### Important

1. **[TOUCH TARGETS]** Cropper modal aspect-preset buttons and "0°" reset are **31 px tall** at 375 px (and **33–38 px** at 360 px) — below the 44 px iOS HIG minimum. The "Annuler" / "Recadrer" actions are correctly sized at 46 px. Severity: **Important**. Suggested fix: bump `tool-btn` vertical padding inside the cropper modal (e.g. wrap the preset row in `py-2`, or use `min-h-[44px]` on each preset button). Same pattern applies to the editor-toolbar's Photos / Vidéo / Son / GIF / Voix buttons (33 px at 360 px), but that is **pre-existing** on the base branch, not introduced by PR #5.

#### Nit

2. **[CONTRAST / AESTHETIC]** Title text `text-white` against the very dark `bg-black/80` overlay is fine, but the `retro-panel` itself has `background-color: rgba(0,0,0,0)` (transparent). On a black backdrop this reads as transparent-on-black which is intentional, but a thin inner border or solid fallback (e.g. `bg-black/60` on the panel) would help if the modal is ever shown over a less-dark surface. Severity: **Nit**.

3. **[A11Y]** The modal exposes `role="dialog"`, `aria-modal="true"`, and `aria-label="Recadrer l'image"` — good. The "0°" reset uses only a `title` attribute; consider adding `aria-label="Remettre la rotation à zéro"` for screen readers. Severity: **Nit**.

4. **[FOCUS TRAP]** Escape-to-cancel works, but focus is not trapped inside the modal (Tab can escape past the action buttons back into the underlying editor). Not strictly required for a "modal" used in a small contained flow, but worth a follow-up. Severity: **Nit**.

5. **[CROP-CONTAINER AT 55 VH]** At 360×800 the panel `max-h-full` leaves the crop area 740 px tall; the 55 vh = 440 px crop region leaves room for the controls without scrolling. At 360×568 (shortest iPhone-SE) the panel could exceed the viewport — outside the scope of this report but worth flagging for future regression. Severity: **Nit**.

### Screenshots produced (10)

| Path | Content |
| --- | --- |
| `task-memory/screenshot/feat-image-cropper-compression/editor-toolbar-desktop.png` | Post editor toolbar with "🖼️ Photos" button (no cropper open) — 1280×800 |
| `task-memory/screenshot/feat-image-cropper-compression/editor-toolbar-mobile.png` | Same, 375×812 |
| `task-memory/screenshot/feat-image-cropper-compression/compte-avatar-desktop.png` | /compte avatar uploader (no cropper open) — 1280×800 |
| `task-memory/screenshot/feat-image-cropper-compression/compte-avatar-mobile.png` | Same, 375×812 |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-default-desktop.png` | Cropper modal at Libre / zoom 1 / rotation 0 — 1280×800 |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-default-mobile.png` | Same, 375×812 |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-aspect-1-1.png` | Cropper with 1:1 selected (square crop box) — 375×812 |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-rotation.png` | Cropper with rotation slider moved to 45° — 1280×800 |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-360px.png` | Bonus — narrowest mobile (360×800), shows flex-wrap of "16:9" |
| `task-memory/screenshot/feat-image-cropper-compression/cropper-compte-avatar-1-1.png` | Bonus — cropper opened from /compte, proving `cropAspect={1}` |

### Verdict

**REQUEST CHANGES** — no blockers; one Important (touch target size for the aspect-preset buttons and "0°" reset inside the cropper modal). All other criteria pass: no overflow at 360 / 375 / 1280 px, retro pink aesthetic intact, 1:1 lock works from /compte, GIF bypass works, Escape closes the modal.

### Spotlight for the reviewer

1. **Mobile touch targets inside the modal** (preset buttons and "0°" reset at 31 px). Easy fix in CSS: bump padding to `px-3 py-2` or add `min-h-[44px]` to `.tool-btn` *within* the modal scope.
2. **Avatar `cropAspect={1}` wiring** (`compte/page.tsx:64`) — verified end-to-end: opening from /compte lands on the 1:1 preset and produces a square crop box. No bug here; flagging it because it's the single most user-facing behaviour of the avatar flow.
3. **Escape-to-cancel** (`ImageCropper.tsx:73-78`): `cancelRef` correctly avoids re-binding on every render, but worth confirming in the review that the `useEffect` deps array (`[busy]`) doesn't unmount/remount the listener more than needed.
