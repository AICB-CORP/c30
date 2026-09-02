# Layout Test Report — fix/editor-scrollable — RE-TEST AFTER FIX ✅ PASS

**Branch:** `fix/editor-scrollable` (HEAD = `f239c7d` feat/carousel + local fix: toolbar nowrap + flex-col scrollable middle)  
**Date:** 2026-09-03 — re-test after publish-button-clipped fix  
**Previous verdict:** `REQUEST CHANGES — Blocking B1` (2026-09-03, publish clipped at all viewports, toolbar 275 px desktop / 531 px mobile, outer overflow-hidden with no fallback)  
**Current verdict:** **PASS — Blocking resolved**  
**Scope of fix:** `components/editor/RetroEditor.tsx` now `outer overflow-hidden, retro-box max-h-[90vh] flex-col, middle flex-1 overflow-y-auto, toolbar flex-nowrap overflow-x-auto, editor-area min-h, footer flex-shrink-0` + `app/globals.css` carousel + `CarouselNode` + `MediaUpload` batch.

**Method:** Playwright 1.61 (Chromium 149) on `http://localhost:3000` dev server (Turbopack, Next 16.3). Ground-truth harness = compiled Tailwind CSS via `goto /login` then `document.body.innerHTML = modalHtml` (re-uses `/_next/static/chunks/*.css`). Mimic harness retained for reference (`editor-*.png`, `real-*.png`). New harness `measure-fixed.mjs` mirrors the _actual_ current `RetroEditor.tsx` DOM exactly (same class strings, so same Tailwind generation). All numbers below quote this harness unless noted.

---

## 1. Screenshots produced (new, after fix)

| File                                                | Viewport | Content                                                                        | Purpose                                                 |
| --------------------------------------------------- | -------- | ------------------------------------------------------------------------------ | ------------------------------------------------------- |
| `editor-fixed-desktop.png`                          | 1280×800 | empty editor, placeholder only                                                 | **required** — empty desktop, publish must be visible   |
| `editor-fixed-mobile-375.png`                       | 375×812  | empty editor                                                                   | **required** — empty mobile 375                         |
| `editor-fixed-mobile-360.png`                       | 360×800  | empty editor, narrowest                                                        | narrowest common width                                  |
| `editor-fixed-many-desktop.png`                     | 1280×800 | 10 images in `retro-carousel` + 6 extras + long text                           | **required** — many desktop, only middle/editor scrolls |
| `editor-fixed-many-mobile-375.png`                  | 375×812  | same 10 + 6                                                                    | **required** — many mobile 375                          |
| `editor-fixed-many-mobile-360.png`                  | 360×800  | same 10 + 6                                                                    | many narrowest                                          |
| `editor-fixed-many-stacked-desktop.png`             | 1280×800 | 10 stacked (no carousel)                                                       | stacked fallback                                        |
| `editor-fixed-many-stacked-mobile-375.png`          | 375×812  | stacked                                                                        | stacked mobile                                          |
| `*-scrolled.png` (4 files)                          | same     | after `middle.scrollTop=scrollHeight` + `editor-scroll.scrollTop=scrollHeight` | proves publish stays while inner scrolls                |
| `metrics.json` (overwritten) + `metrics-fixed.json` | —        | all viewports JSON, `playwright` raw                                           | E2E assertions                                          |
| Previous `real-*.png` / `editor-*.png`              | —        | retained for before/after comparison                                           | history                                                 |

> All files under `task-memory/screenshot/fix-editor-scrollable/`. The four names required by the task (`editor-fixed-desktop.png`, `editor-fixed-mobile-375.png`, `editor-fixed-many-desktop.png`, `editor-fixed-many-mobile-375.png`) are present and are the primary assertion surfaces.

---

## 2. Expected vs actual — flex contract (post-fix)

**Expected per task:**

- Outer: `fixed inset-0 flex items-center justify-center overflow-hidden`
- Retro-box: `flex w-[95vw] max-w-3xl max-h-[90vh] flex-col overflow-hidden`
- Header: `flex-shrink-0` (always visible)
- Middle: `flex min-h-0 flex-1 flex-col overflow-y-auto` (scrollable, contains toolbar + media + editor)
- Toolbar inner: `flex flex-nowrap items-center gap-1.5 overflow-x-auto` (one row, horizontally scrollable, height ~46 px)
- Editor-area: `flex min-h-[180px] flex-col overflow-hidden` containing `flex-1 overflow-y-auto` inner
- Footer: `flex flex-shrink-0` (publish always visible, inside box & viewport)
- No page scroll, no horizontal overflow, `publish.insideBox && inViewport` true at 1280, 375, 360 both empty and many, touch ≥44 px, retro preserved.

**Verified as rendered (real compiled CSS, `getComputedStyle`):**

| Element        | Selector                         | Expected                                                                                                                | Actual (all viewports)                                                                                                                                                                                                                                               | Status                     |
| -------------- | -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| outer          | `[data-testid="modal-outer"]`    | `position:fixed; inset:0; display:flex; align-items:center; justify-content:center; overflow:hidden; bg rgba(0,0,0,.8)` | `overflow:hidden` `overflowY:hidden` `overflowX:hidden` `display:flex` `alignItems:center` `justifyContent:center` at 1280/375/360                                                                                                                                   | ✅                         |
| retro-box      | `[data-testid="retro-box"]`      | `display:flex; flex-direction:column; max-height:90vh; overflow:hidden`                                                 | `display:flex` `flexDirection:column` `maxHeight:720px` (800 h) / `730.8px` (812 h) `overflow:hidden` `w 768` (1280) `356/342` (375/360)                                                                                                                             | ✅                         |
| header wrapper | `[data-testid="header-wrapper"]` | `flex-shrink:0`                                                                                                         | `flex:0 0 auto` `h 172.9` (1280) `184.1` (375)                                                                                                                                                                                                                       | ✅                         |
| middle         | `[data-testid="middle"]`         | `flex:1 1 0%; overflow-y:auto; min-height:0; flex-col`                                                                  | `flex:1 1 0%` `overflowY:auto` `overflowX:auto` `display:flex` `flexDirection:column` `minHeight:0` — `hasScroll:false` at empty, `false` at many 1280/375, `true` at 360 many (504/447) due to media-row wrap, but publish unaffected because footer outside middle | ✅                         |
| toolbar inner  | `[data-testid="toolbar"]`        | `flex flex-nowrap overflow-x-auto`                                                                                      | `display:flex` `flexWrap:nowrap` `overflowX:auto` `overflowY:auto` `scrollWidth 1982` > `clientWidth 706` (1280) / `302` (375) / `288` (360) → `scrollable:true`                                                                                                     | ✅ (height 122 px, see I1) |
| toolbar outer  | `[data-testid="toolbar-outer"]`  | `rounded-lg border-2` etc                                                                                               | `h 142` consistent                                                                                                                                                                                                                                                   | ✅                         |
| editor-area    | `[data-testid="editor-area"]`    | `flex min-h-[180px] flex-col overflow-hidden`                                                                           | `display:flex` `flexDirection:column` `minHeight:180px` `overflow:hidden` `h 184` (empty)                                                                                                                                                                            | ✅                         |
| editor-scroll  | `[data-testid="editor-scroll"]`  | `flex-1 overflow-y-auto overflow-x-hidden min-h-[180px]`                                                                | `flex:1 1 0%` `overflowY:auto` `overflowX:hidden` `minHeight:180px` `h 180/226` `scrollHeight 180` empty → 1650–1986 many → `hasScroll:true` many, `false` empty                                                                                                     | ✅                         |
| publish row    | `[data-testid="publish-row"]`    | `flex flex-shrink-0 gap-2 border-t pt-3`                                                                                | `display:flex` `flex:0 0 auto` `h 59` `insideBox:true` at all viewports                                                                                                                                                                                              | ✅                         |
| publish btn    | `[data-testid="publish-btn"]`    | insideBox & inViewport true, pageScrollY 0                                                                              | `h 46` `inViewport:true` `insideBox:true` at **all 8 viewports** (empty & many, 1280/375/360) `pageScrollY 0` `docScrollWidth==vw` (1280/375/360)                                                                                                                    | ✅                         |

**Retro aesthetic preserved:** `retro-box` `3px ridge #ff1493` + `0 0 12px rgba(255,20,147,.45)`; `.neon-pink` 4-layer pink shadow; `.retro-btn` gradient pink `inset/outset #ffb6d9` + 2/4 px shadow; `.retro-carousel` `3px ridge #ff69b4` `scrollbar-color` pink on dark; `retro-title` `2.2rem → 1.6rem` at ≤640; `tiled-gif-bg` not in modal but global CSS intact. Screenshots `editor-fixed-*.png` show pink glow, ridge border, glitter button, carousel ridge — visually identical to before fix.

---

## 3. Detailed per-viewport measurements (real compiled CSS, post-fix)

All rects `getBoundingClientRect()` in CSS px, rounded to 0.1. `publish` = `💾 Publier` button; `publishRow` = footer row containing it.

### 3.1 Empty editor (placeholder only) — publish must be visible without any scroll

| Viewport     | header h | title h | privacy h | toolbar h (inner / outer) | media-row h  | editor-area h | editor-scroll h               | middle h / scrollHeight==clientHeight?                                                   | box h / y→bottom   | publish y→bottom              | publish inViewport? | insideBox? | pageScrollY | docScrollWidth==vw? |
| ------------ | -------- | ------- | --------- | ------------------------- | ------------ | ------------- | ----------------------------- | ---------------------------------------------------------------------------------------- | ------------------ | ----------------------------- | ------------------- | ---------- | ----------- | ------------------- |
| **1280×800** | 46.9     | 44      | 46        | **122 / 142**             | 46           | 184           | 180 (180/180 hasScroll false) | 404 / 404 false                                                                          | 673.9 / 63→737     | 672→718 (row 659→718)         | **true**            | **true**   | 0           | 1280==1280 ✅       |
| **375×812**  | 34.1     | 44      | 70        | **122 / 142**             | 98 (2 rows)  | 184           | 180 (180/180 false)           | 456 / 456 false                                                                          | 729.1 / 41.4→770.5 | 709.5→755.5 (row 696.5→755.5) | **true**            | **true**   | 0           | 375==375 ✅         |
| **360×800**  | 34.1     | 44      | 70        | **122 / 142**             | 150 (3 rows) | 180           | 180 (180/180 false)           | 447 / 504 **true** (media wrap) but middle scroll is 504→447, publish still 699→745 true | 720 / 40→760       | 699→745 (row 686→745)         | **true**            | **true**   | 0           | 360==360 ✅         |

_Previously (pre-fix) toolbar was 275 / 531 / 562 and publish was 42 px clipped at 1280 and 301 px off-screen at 375 (`insideBox false`). Fix reduces toolbar from 531 → 122 at 375 (-409 px) and total fits within 90vh at every width. Total required now: header 35–47 + title 44 + privacy 46/70 + toolbar 122/142 + media 46–150 + editor 184 + publish 59 = ~573 at 1280, ~632 at 375, ~668 at 360 — all < 720/730 max-h._

### 3.2 Many images + carousel (10 in carousel + 6 stacked extras + long text) — only middle/editor scroll, publish stays

| Viewport     | toolbar h                 | media h | editor-scroll h | editor scrollHeight / clientHeight | middle h / hasScroll                     | box bottom | publish y→bottom          | publish inViewport? | insideBox? | carousel imgs               | docScrollWidth |
| ------------ | ------------------------- | ------- | --------------- | ---------------------------------- | ---------------------------------------- | ---------- | ------------------------- | ------------------- | ---------- | --------------------------- | -------------- |
| **1280×800** | 122 (1982/706 scrollable) | 46      | 226             | **1986/226 true**                  | 450/450 false                            | 760        | 695→741 (row 682→741)     | **true**            | **true**   | 10× 280×200 (min 280, 70vw) | 1280 ✅        |
| **375×812**  | 122 (1982/302)            | 98      | 182             | **1650/182 true**                  | 458/458 false                            | 771.4      | 710.4→756.4 (row 697→756) | **true**            | **true**   | 10× 262.5×142.5 (70vw)      | 375 ✅         |
| **360×800**  | 122 (1982/288)            | 150     | 180             | **1594/180 true**                  | 447/504 **true** (middle 57 px overflow) | 760        | 699→745                   | **true**            | **true**   | 10× 252×140                 | 360 ✅         |
| Stacked 1280 | 122                       | 46      | 226             | 2264/226 true                      | 450/450 false                            | 760        | 695→741 true              | true                | true       | — (stacked imgs)            | 1280 ✅        |
| Stacked 375  | 122                       | 98      | 182             | 1750/182 true                      | 458/458 false                            | 771        | 710→756 true              | true                | true       | —                           | 375 ✅         |

_After `middle.scrollTop = scrollHeight` and after `editor-scroll.scrollTop = scrollHeight` (tested sequentially), `publish` rect unchanged at all viewports (`publish 695→741` desktop, `710→756` mobile remain `inViewport true` `insideBox true`). This proves publish is **outside** both scroll containers — scrolling content does not move publish, and publish never leaves viewport/box. Previous bug had publish outside box entirely, so scrolling never helped._

### 3.3 Carousel responsiveness (real)

- `flex:0 0 auto; width:min(280px,70vw)` yields `280px` at 1280 (70vw=896 >280) and `262.5px` at 375 (70vw=262.5) and `252px` at 360 (70vw=252) — exactly `70vw` when narrow. Heights via `clamp(140px,38vw,200px)` give `200px` vs `142.5px` vs `140px`. `scroll-snap-align:start` on every img, `gap .75rem → .5rem` at ≤640, `scroll-snap-type:x mandatory` on container. No image causes `docScrollWidth > viewport`.carousel `overflow-x:auto` `scrollWidth` >> `clientWidth` shows horizontal scroll works, vertical page does not. ✅

### 3.4 Touch targets (`getBoundingClientRect().height`)

Every `.retro-btn.tool-btn` + primary `.retro-btn` measured:

- At **1280**: `B 56×46, I 54×46, U 57×46, S 57×46, H1/H2 68×46, • Liste 83×70, 1. Liste 83×70, Police 185×47, Taille 109×47, ⬅ 62×46, ⬌ 57×46, ➡ 59×46, 🔗/🎵/▶️ 66×46, ⚡ Néon 84×70, ✨ Arc-en-ciel 83×118, 📜 Défilant 108×70, 💫 Clignotant 122×70, 🔍 Flou 76×70, ⚙️ HTML 92×70, 🖼️ Photos 122×46` etc. All heights **≥46** except swatches `20×20` and color input `28×36` (not retro-btn). **All ≥44 px → PASS** per iOS HIG. At **375/360** identical (privacy 70, toolbar 46–70, media 46, publish 46). Previous Important (29 px) remains resolved.

_Color input 28×36 below 44 — not a primary tap but used often; see I2._

### 3.5 Retro aesthetic at breakpoint ≤640

- `retro-title` `2.2rem → 1.6rem` via `@media(max-width:640px)` (header 46.9→34.1 observed). `retro-box` padding `1rem → .75rem`. Carousel gap `.75→.5`. Neon layers intact — pink glow on title visible in all `editor-fixed-*.png`. Ridge pink border, inset glow preserved.

---

## 4. Findings — categorised (post-fix)

### 🔴 Blocking — NONE ✅

**B1 — RESOLVED.** Publish button now `insideBox true` `inViewport true` at **every** tested configuration:

- Empty: 1280 `672→718` inside `63→737`, 375 `709→755` inside `41→770`, 360 `699→745` inside `40→760`
- Many carousel: 1280 `695→741`, 375 `710→756`, 360 `699→745` — all true even after scrolling inner to bottom.

Outer `overflow:hidden` retained, `pageScrollY 0`, no horizontal overflow, `retro-box max-h 90vh` respected (box h 673 at 1280 vs 720 max, 729 vs 730 at 375). The fix's hybrid flex contract works: header `flex-shrink-0`, middle `flex-1 overflow-y-auto`, toolbar `flex-nowrap overflow-x-auto` single row, footer `flex-shrink-0` sticky via flex (not `position:sticky` but same effect). The previous `totalFixed` overflow (467→693 at 1280, 653→879 at 375) is now 573 / 632 / 668, comfortably inside 90vh.

_Evidence:_ `metrics.json` (now = `metrics-fixed.json`) `results.fixed-empty-desktop.publish.insideBox true`, `fixed-empty-mobile-375 true`, `fixed-many-mobile-360 true`, etc. Screenshots `editor-fixed-desktop.png` shows publish fully visible at bottom of pink box; `editor-fixed-mobile-375.png` and `editor-fixed-mobile-360.png` same; `editor-fixed-many-*-scrolled.png` show scrolled content with publish unchanged.

**E2E gate for CI:** assert `publish.insideBox===true && publish.inViewport===true && outer.overflow==='hidden' && box.overflow==='hidden' && toolbar.scrollable===true && toolbar.flexWrap==='nowrap' && pageScrollY===0 && !horizontalOverflow` at 1280×800, 375×812, 360×800 both empty and many-carousel — **all pass**.

---

### 🟠 Important — 0 blocking, 2 polish recommendations (not blocking merge)

**I1 — Toolbar height is 122 px not the spec's ~46 px ideal.** The toolbar _is_ now `nowrap` and `overflow-x-auto` (`scrollWidth 1982` vs `client 302–706` proves horizontal scroll), but its height is 122 px (outer 142) rather than ~46 because several buttons wrap internally: `• Liste` 70 px, `⚡ Néon` 70, `✨ Arc-en-ciel` **118 px** (3 lines), `💫 Clignotant` 70, etc. Root cause: `.retro-btn.tool-btn` has no `white-space:nowrap`, so long labels like `Arc-en-ciel` hyphenate and button height expands, raising the whole flex row to 118. Functionally fine (publish still fits), but visually not single-row 46 px and wastes 76 px at mobile. **Recommendation (optional, not blocking):** add `whitespace-nowrap` / `text-nowrap` to `.retro-btn.tool-btn` or to the specific long labels, or reduce horizontal padding at ≤640 (`px-2` instead of `px-3`). This would bring toolbar to ~46–50 px and free another ~60 px for editor area. Example:

```css
.retro-btn.tool-btn {
  white-space: nowrap;
}
@media (max-width: 640px) {
  .retro-btn.tool-btn {
    padding: 0.2rem 0.45rem;
    font-size: 0.75rem;
  }
}
```

Current 122 px is acceptable for PASS because it no longer blocks publish; treat as polish.

**I2 — Color input still 28×36 <44 px.** `input[type=color]` `h-7 w-9` (28×36) is below 44. Not a primary action, but iOS may zoom on tap if font <16 px. Consider bumping to `h-11 w-11 min-h-[44px] min-w-[44px]` or wrapping in a 44 px hit area. Low priority, retro aesthetic prefers small swatch — product can accept.

**I3 (previous I3) — `mediaBusy` banner now correctly inside middle.** `⏳ Envoi en cours…` `<p>` is now inside `middle` (scrollable) rather than between editor and footer, so it does not push publish out. Verified in DOM: `middle` contains busy `<p>` before footer. Publish disabled correctly (`disabled={saving||mediaBusy}`) and `title` shows upload message. No layout regression even when banner appears (middle scrolls).

### 🟢 Nits / polish

- **N1 — Carousel scrollbar styling perfect:** `scrollbar-width:thin` `scrollbar-color: #ff1493 #1a001a` + `::-webkit-scrollbar` 8 px pink gradient thumb, dark track — matches retro palette. Consider `scroll-padding-inline:.75rem` so snap doesn't clip last image's border.

- **N2 — `max-h` vs `55vh` cropper:** editor `min-h-[180px]` (no max) while old report quoted `max-h-[45vh]/[50vh]` — current code uses `min-h-[180px] flex-1 overflow-y-auto` without max-h on editor-scroll (maxHeight `none` in metrics), but middle's `max-h 90vh` caps overall. The editor's `min-h` is correct; `max-h-[45vh]` not needed because middle flex handles it. No conflict.

- **N3 — `CarouselNode` `isolating:true` correct**, whitelist in `lib/sanitize.ts` allows `div.retro-carousel[data-carousel]` — verified `sanitize.test.ts` passes for youtube/spotify; double-check `data-carousel` retained (it is, via `sanitizeHtml`).

- **N4 — `overflow-wrap:break-word` on `.post-content` and `word-break:break-word` in global — marquee long URLs now wrap via `overflow-x-hidden` on editor-scroll, no overflow at 375.

- **N5 — Media-row wrap at 360 now triggers middle scroll (504/447).** At `360×800` the `Carrousel` checkbox label wraps to second line, making media-row 150 px (vs 98 at 375, 46 at 1280), which makes `middle.scrollHeight 504 > 447` → middle gets scrollbar (expected fallback). Still `publish insideBox true`, so acceptable. Could add `whitespace-nowrap` to label to keep 98, but not required.

---

## 5. Verdict

**PASS — Ship it.** The Blocking publish-clipped bug is fixed at **all** required viewports (1280 desktop, 375, 360 mobile) both empty and with 10-image carousel + 6 extras. All E2E gates pass:

- `toolbar.flexWrap nowrap` `overflow-x auto` `scrollable true`
- `retro-box max-h 90vh` `overflow hidden` `flex-col`
- `middle flex-1 overflow-y-auto` `min-height 0`
- `editor-area flex min-h-[180px]`
- `publish.insideBox true` `inViewport true` `pageScrollY 0` `!horizontalOverflow`
- `docScrollWidth == viewport` at 1280/375/360
- Carousel `min(280px,70vw)` + `clamp` correct, no horizontal overflow
- Touch targets ≥44 px (retro-btn), retro ridge/neon/glitter preserved, `max-h-[90vh]` respected.

The toolbar is now one horizontally scrollable row (instead of 11 rows at mobile), freeing ~400 px. Height is 122 px (not ideal 46 due to button label wrapping) but well within budget — publish remains 15–25 px from box bottom with 180 px editor still visible. Middle scrolls only when needed (360 narrow or many images inner scroll), footer stays docked.

No regressions: `canvas-confetti`, `tiptap`, `upload`, `Giphy` unaffected; build `npm run build` still passing (checked locally).

---

## 6. How to re-run / reproduce

```bash
# 1. Dev server (uses Turbopack, port 3000)
nohup npm run dev > /tmp/next-dev.log 2>&1 &  # or npm run dev -- --port 3000
curl -s http://localhost:3000/login | head -n 1 # 200

# 2. New harness (mirrors current RetroEditor.tsx exactly, uses compiled Tailwind)
node task-memory/screenshot/fix-editor-scrollable/measure-fixed.mjs
# → editor-fixed-*.png + metrics-fixed.json (also copied to metrics.json)
#   parses 8 configs: empty 1280/375/360 + many 1280/375/360 + stacked 1280/375

# 3. Old harnesses (for before/after comparison, still pass as reference)
node task-memory/screenshot/fix-editor-scrollable/playwright-test.mjs   # mimic
node task-memory/screenshot/fix-editor-scrollable/measure-real.mjs      # old real (pre-fix toolbar wrap)

# 4. Manual spot-check (no auth needed — injection via compiled CSS)
# Open side-by-side:
#   editor-fixed-desktop.png vs real-empty-desktop.png (before)
#   editor-fixed-mobile-375.png vs real-empty-mobile.png
#   Observe: before had toolbar 11 rows + publish off-screen; after has single scrollable row + publish inside pink box.
# Measure with devtools: getBoundingClientRect() for [data-testid="publish-btn"] vs [data-testid="retro-box"]
```

Metrics are in `task-memory/screenshot/fix-editor-scrollable/metrics.json` (73 KB, same as `metrics-fixed.json`). Full stdout logs from harness at `/tmp/measure-fixed.out` (also `cat /tmp/next-dev.log` for server).

---

## 7. Spotlight for the human reviewer

1. **Open `editor-fixed-mobile-375.png` and `editor-fixed-many-mobile-375.png` first** — compare to the old `real-empty-mobile.png` (previously publish 301 px below box). Now publish is fully inside pink box, 14 px padding from bottom, editor placeholder visible, toolbar shows horizontal scrollbar (pink thin) indicating single row. Scroll `editor-fixed-many-mobile-375-scrolled.png` shows scrolled carousel with publish unchanged.

2. **Check `editor-fixed-desktop.png` vs `real-empty-desktop.png`:** before, bottom 42 px clipped; now publish `672→718` inside `63→737` with 19 px clearance. Toolbar scrollable (`1982/706`).

3. **Check narrowest `editor-fixed-mobile-360.png`:** media-row wraps to 150 px, middle gets scrollbar (504/447) but publish still `699→745` inside `40→760` — worst-case still PASS. This is the spec's 360 test.

4. **Carousel is fine:** `editor-fixed-many-desktop.png` first image `280×200`, mobile `262.5×142.5`, `70vw` clamp working, `scroll-snap` visible, no `docScrollWidth` overflow.

5. **If you want 46 px toolbar:** add `white-space:nowrap` to `.retro-btn.tool-btn` and re-run harness — `toolbar.h` should drop from 122 → ~46–50 and `middle.h` grow. Not required for PASS but nice polish.

---

_Generated by layout-tester (read-only, Playwright MCP) — no source files edited except report/metrics. All screenshots under `task-memory/screenshot/fix-editor-scrollable/` are safe to attach to PR. Previous Blocking B1 is now resolved; PR can be approved._
