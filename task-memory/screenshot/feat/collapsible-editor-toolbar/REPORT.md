# Layout Test Report — feat/collapsible-editor-toolbar

**Round 3 — FINAL verification — 2026-09-27** _(Round 2 below, Round 1 at the bottom)_

**Fixes under test (round 3):**

- **F2-v2** (the remaining round-2 IMPORTANT): toolbar region className now `… max-md:max-h-[calc(42vh-80px)] max-md:overflow-y-auto` — the 80px subtracts the sticky chrome (handle ~51 + mt-2 8 + padding 16 + border ~4) so the **whole sticky block is guaranteed ≤ 42vh** on mobile.
- **Boundary nit fix**: component `<style>` mobile rule now `@media (max-width: 767.98px)` and `useCollapsibleToolbar` MOBILE_QUERY now `(max-width: 767.98px)` — aligned with Tailwind v4's md boundary (max-md = 767.98px, md = 768px).

Harness re-synced with the exact current source (region className, style block, hook query). **Round 3 result: 57/57 automated checks pass — clean sweep.**

---

## Per-fix verdicts

### Fix F2-v2 — calc(42vh−80px) cap: **PASS ✅** (round-2 IMPORTANT finding RESOLVED)

End-to-end verified at all three mobile heights — expand → tap editor band → focus → auto-collapse fires:

| Viewport | Region cap (computed)            | Region rendered                                           | Space below sticky (at rest) | Tap band (after minimal swipe) | Editor visible at rest, expanded | Auto-collapse                 | Guard                            | Screen-space win     |
| -------- | -------------------------------- | --------------------------------------------------------- | ---------------------------- | ------------------------------ | -------------------------------- | ----------------------------- | -------------------------------- | -------------------- |
| 375×667  | `calc(42vh−80px)` → **200.14px** | 200px, internal scrollbar (scrollHeight 263 > client 200) | **45.2px**                   | **27.2px**                     | 51px                             | ✅ fires (1295ms since touch) | —                                | **+208px** (51→259)  |
| 360×740  | → **230.8px**                    | 231px, internal scrollbar (304 > 231)                     | **80.2px**                   | **62.2px**                     | 89px                             | ✅ fires (1291ms)             | —                                | **+191px** (89→280)  |
| 375×812  | → **261.04px**                   | 261px, internal scrollbar (263 > 261)                     | **114.8px**                  | **96.8px**                     | 127px                            | ✅ fires (1286ms)             | ✅ holds @166ms, expires @1279ms | **+153px** (127→280) |

All PM expectations hit (region ≈200/231/261, band ≈45/80/97). The cap subtracts the chrome exactly as designed: sticky block now ≤ middle scrollport at every phone height (279/310/340 vs middle 324/390/455). At rest the 45–115px band below the sticky is where the media row sits; the editor enters it after a minimal swipe (what `tapVisible` simulates) — and unlike rounds 1–2, **no scroll amount was previously able to reveal the editor at 667/360; now it always can**, which is what makes auto-collapse reachable. Collapsed-state regressions: none (collapsed default ✓, editor 259/280/280px visible, handle 302/288×51 ≥44px, labels/aria ✓, Publier ✓, zero horizontal overflow at 375/360 ✓). Collapse still instant (0.1ms), retro handle look intact.

**Side-effect bonus:** the round-1/2 nit **R1-4 (top ~8px of handle clipped when oversized sticky scrolled to bottom) is RESOLVED** — the sticky block never exceeds the scrollport anymore, verified at all three heights (`handle.top ≥ middle.top − 1.5` while scrolled to bottom).

### Boundary nit fix — 767.98px alignment: **PASS ✅** (round-2 NEW nit RESOLVED)

- **Source-level**: all four boundaries now agree — component CSS `max-width:767.98px`, hook `matchMedia("(max-width:767.98px)")`, Tailwind `max-md:` (767.98px), Tailwind `md:`/component desktop rule (768px). The old 767–767.98px disagreement window (stray inline-block pill + hook/desktop mismatch) is gone; residual theoretical gap is (767.98, 768) = **0.02px** — unreachable in practice (CSS viewport widths quantize far coarser).
- **Empirical**: **767px** → fully mobile (handle `display:flex`, 667px full-width of 687px sticky, toolbar collapsed by default) ✅ · **768px** → fully desktop (`display:none`, 0×0 box, toolbar open) ✅ · **767.5px** (fractional, via a 767.5px iframe inside the harness — Playwright viewports are integers): Chromium rounds the fractional **media** viewport (767.5 → 768) while **layout stays fractional** (sticky measured 688px = computed from 767.5) → **all rules co-decide "desktop"**: no stray pill (`display:none`, not `inline-block`), hook consistent (`toolbarOpen=true`) ✅. Whatever Chromium rounds to, every rule now sees the same side — the inconsistency the nit described can no longer occur.

### Desktop 1280×800: **UNREGRESSED ✅**

`display:none`, 0×0 box, not clickable (`elementFromPoint` → toolbar button), **no cap** (`max-height:none`, `overflow-y:visible`), region 111px — **byte-identical geometry to rounds 1 and 2** (111px), 26 buttons + 2 selects, 💾 Publier visible, doc width ≤1280, breakpoint re-eval keeps toolbar open.

---

## Updated finding list (after Round 3)

| #       | Severity  | Status                              | Finding                                                                                                               |
| ------- | --------- | ----------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| R1-1    | blocking  | RESOLVED (round 2)                  | desktop handle visible via cascade — media-scoped rule verified                                                       |
| R1-2/R2 | important | **RESOLVED (round 3)**              | 375×667 editor covered while expanded — sticky now 279 < middle 324, editor reachable, auto-collapse fires end-to-end |
| R2-3    | important | **RESOLVED (round 3)**              | 360×740 editor untappable while expanded — band 80.2px at rest / 62.2px tappable, auto-collapse fires end-to-end      |
| R1-4    | nit       | **RESOLVED (round 3, side effect)** | handle top clipped when oversized sticky scrolled — sticky never oversized anymore                                    |
| R2-6    | nit       | **RESOLVED (round 3)**              | 767–767.98px fractional dead zone — all boundaries aligned at 767.98/768                                              |
| R1-5    | nit       | **ACCEPTED pre-existing**           | 20px swatch / 28px color-input touch targets — predates this PR, out of scope                                         |

**Open: blocking 0 · important 0 · nit 1 (accepted, pre-existing).**

## Round 3 final verdict

**PASS — ship it (from a layout perspective).** Every finding from rounds 1 and 2 is resolved and verified; the collapsible toolbar now delivers its full promise on every phone height tested (375×667, 360×740, 375×812): collapsed by default with +153…+208px of visible editor, a reachable expanded state (capped at `calc(42vh−80px)` with internal scroll), focus-driven auto-collapse everywhere, 800ms guard semantics, instant era-authentic collapse, sticky full-width ≥44px handle, zero horizontal overflow at 375 and 360 — and desktop remains byte-for-byte unchanged. The only remaining note is the pre-existing 20px swatch targets (accepted, predates the PR).

## Round 3 screenshots

- `editor-collapsed-667-r3.png` / `editor-expanded-667-r3.png` (tap indicator on the band) / `editor-autocollapse-667-r3.png`
- `editor-collapsed-360-r3.png` / `editor-expanded-360-r3.png` (tap indicator) / `editor-autocollapse-360-r3.png` / `editor-expanded-scrolled-360-r3.png`
- `editor-collapsed-812-r3.png` / `editor-expanded-812-r3.png` / `editor-autocollapse-812-r3.png` / `editor-guard-stays-open-812-r3.png` / `editor-guard-expires-812-r3.png`
- `boundary-767-r3.png` / `boundary-768-r3.png` / `boundary-767.5-r3.png` (fractional via 767.5px iframe)
- `editor-desktop-unchanged-r3.png`

Artifacts: `layout-test.mjs` (round-3 harness), `metrics.json` (round 3), `metrics-round1.json`, `metrics-round2.json` (preserved).

---

---

# Round 2 (historical) — fixes re-verified, 2026-09-27

_(Round 1 report preserved below)_

**Fixes under test** (applied by the PM to `components/editor/RetroEditor.tsx` after Round 1):

- **F1** (was Round-1 BLOCKING): `.styles-handle` CSS now media-scoped in the component's unlayered `<style>` block — `@media (max-width:767px){display:flex…}` + `@media (min-width:768px){display:none}` — hiding the handle on desktop directly instead of relying on Tailwind's layered `md:hidden`. `md:hidden` kept on the className as belt-and-suspenders.
- **F2** (was Round-1 IMPORTANT): toolbar region className now `… max-md:mt-2 max-md:max-h-[42vh] max-md:overflow-y-auto` — expanded region capped at 42vh with internal vertical scrolling on mobile.

Harness re-synced with the exact post-fix CSS/classes (same faithful cascade reproduction: Tailwind utilities in `@layer utilities` per the compiled chunk; retro CSS + component `<style>` unlayered). **Round 2 result: 44/45 automated checks pass.**

---

## Per-fix verdicts

### Fix 1 — desktop handle hidden: **PASS ✅** (blocking finding RESOLVED)

| Check                      | Result     | Evidence                                                                                                                                                                                                                                                                                                               |
| -------------------------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| computed `display` @1280   | **`none`** | zero bounding box (0×0)                                                                                                                                                                                                                                                                                                |
| not clickable              | ✅         | `elementFromPoint` at the old handle position returns a `retro-btn.tool-btn` **toolbar button**, not the handle                                                                                                                                                                                                        |
| pixel evidence             | ✅         | old handle center line (y=303): Round 1 = full-width pink band (14/16 pink samples; 2 dark = white "Styles ▲" glyphs) → Round 2 = **0/16 pink** (no band)                                                                                                                                                              |
| 768px exactly              | ✅         | `display:none`, 0×0 box                                                                                                                                                                                                                                                                                                |
| 767px exactly              | ✅         | handle VISIBLE (`display:flex`, 667×51, full width) + correct mobile behaviour (hook collapses toolbar by default)                                                                                                                                                                                                     |
| desktop layout unregressed | ✅         | region `max-height:none`, `overflow-y:visible` (no cap on desktop), region 111px = Round 1, 26 buttons, 💾 Publier visible, no overflow, breakpoint re-eval keeps toolbar open                                                                                                                                         |
| cascade probe (post-fix)   | ✅         | probe A (real handle classes) → **`none`**; B (`md:hidden` alone) → `none`; C (`retro-btn`+`md:hidden`, no styles-handle) → `inline-block` — confirms the dedicated unlayered media rule does the hiding, and the general unlayered-vs-layered caveat still exists for other elements but no longer affects the handle |

### Fix 2 — 42vh cap + internal scroll: **PARTIAL ⚠️** (mechanism PASS; the 360×740 goal NOT achieved)

| Aspect                                             | Verdict            | Evidence                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| -------------------------------------------------- | ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cap mechanism (structural)                         | **PASS**           | at 375×500 (artificial short viewport): region clamped to **exactly 210px = 42vh**, `overflow-y:auto`, internal scrollbar active (`scrollHeight` 263 > `clientHeight` 210), handle still ≥44px                                                                                                                                                                                                                                                                 |
| Cap applied on all mobile widths                   | PASS               | computed `max-height` = 280.14px @667 / 341.04px @812 / 310.8px @740 — all exactly 42vh                                                                                                                                                                                                                                                                                                                                                                        |
| Desktop unaffected                                 | PASS               | `max-height:none`, `overflow-y:visible` @1280                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 375×812 full flow — no drift                       | PASS               | band 94.8px; focus auto-collapse fires (1264ms since touch); guard holds on B-tap+text-tap (168ms), expires after 900ms (1279ms); screen-space win +155px (125→280px)                                                                                                                                                                                                                                                                                          |
| 375×667 — accepted known limitation, no regression | PASS (as accepted) | region 263px < cap 280px → cap inactive there; sticky 342px vs middle 324px → editor still covered while expanded (band −35.7px) — same as Round 1, **accepted per PM** (equals old permanent layout); handle exit works; win +259px preserved; instant collapse (0.1ms) & retro look intact                                                                                                                                                                   |
| **360×740 — PM's target for this fix**             | **FAIL ❌**        | editor still **untappable** while expanded: band **−11px** (sticky.bottom 624 vs middle.bottom 631; editor top 724 > scrollport bottom 631). Region 304px < cap 310.8px → cap doesn't even bite with harness fonts. **Even with the cap fully active, sticky = 311 (cap) + 51 (handle) + 8 (mt-2) + 16 (padding) + 4 (border) ≈ 390px ≈ the entire middle scrollport (390px)** → no editor band, auto-collapse-on-focus still unreachable at this phone height |

**Root cause of the 360 shortfall (measurement-backed):** the 42vh cap doesn't subtract the handle + paddings that sit above the region in the same sticky block. On a 740px-tall phone the sticky block (region 311 + chrome ~79 = ~390px) consumes the whole middle scrollport (~390px). The cap genuinely helps **taller** phones (≥812: sticky ~420 < middle 456 → ~36px band, more with real-app fonts where the cap actually bites), but cannot free editor space at ~740px and below. PM's literal criterion (`editor.bottom > sticky.bottom`) is trivially true but not meaningful — the meaningful criterion (`editor.top < middle.bottom`) is false at 360×740.

**Suggested directions (advice only — this agent is read-only):** (a) accept 360×740 as the same known limitation as 375×667 and document it; or (b) make the cap leave room for the chrome, e.g. `max-md:max-h-[calc(42vh-80px)]` or a plain `max-md:max-h-[38vh]` (38vh @740 → 281+79=360 < 390 → ~30px tappable band → auto-collapse becomes reachable there).

---

## Updated finding list (after Round 2)

| #    | Severity  | Status                                              | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ---- | --------- | --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| R1-1 | blocking  | **RESOLVED ✅**                                     | Desktop handle visible/clickable (`md:hidden` defeated by unlayered CSS) — fixed by the media-scoped rule, verified at 1280/768/767 + probe + pixels                                                                                                                                                                                                                                                                                    |
| R1-2 | important | **RECLASSIFIED known-limitation (accepted per PM)** | 375×667: editor fully covered while expanded (sticky 342 vs middle 324; band −35.7px) — equals old permanent layout; handle is the exit; win +259px preserved                                                                                                                                                                                                                                                                           |
| R1-3 | important | **REMAINS ❌**                                      | 360×740: editor still untappable while expanded (band −11px; sticky 383 vs middle 390 — cap inactive there, and ~390 even if active). Auto-collapse-on-focus unreachable on ~740px-tall phones                                                                                                                                                                                                                                          |
| R1-4 | nit       | carried                                             | top ~8px of handle clipped when oversized sticky is scrolled to bottom @667 (tappable height ~42.8px in that state)                                                                                                                                                                                                                                                                                                                     |
| R1-5 | nit       | carried (pre-existing)                              | 20px swatch / 28px color-input touch targets                                                                                                                                                                                                                                                                                                                                                                                            |
| R2-6 | nit       | **NEW**                                             | fractional-width dead zone 767–767.98px: component media rules use integer 767/768px while Tailwind `max-md:` is 767.98px — at e.g. 767.5px (possible on DPR-scaled devices) neither component rule applies, so the handle falls back to `.retro-btn` `inline-block` (small stray pill) while the hook treats the width as desktop (toolbar open). ~1px window, rare. Aligning the component media queries to `767.98px` would close it |

**Open: blocking 0 · important 1 · nit 3** (was: 1 blocking · 2 important · 2 nit)

## Round 2 screenshots

- `editor-collapsed-mobile-fix.png` / `editor-expanded-mobile-fix.png` / `editor-expanded-scrolled-mobile-fix.png` / `editor-autocollapse-mobile-fix.png` — 375×667 sweep
- `editor-autocollapse-812-fix.png` / `editor-guard-stays-open-mobile-fix.png` / `editor-guard-expires-mobile-fix.png` — 375×812 full flow
- `editor-collapsed-360-fix.png` / `editor-expanded-360-fix.png` / `editor-autocollapse-360-fix.png` — 360×740 (F2 target)
- `cap-verification-375x500.png` — structural proof the 42vh cap clamps + scrolls internally
- `breakpoint-767.png` / `breakpoint-768.png` — F1 boundary edges
- `editor-desktop-unchanged-fix.png` — 1280×800, handle absent (0/16 pink at old handle line vs 14/16 in Round 1)
- `cascade-probe-desktop-fix.png` — post-fix cascade probe (A hidden)

Artifacts: `layout-test.mjs` (round-2 harness), `metrics.json` (round 2), `metrics-round1.json` (preserved), `metrics-partial.json`.

## Round 2 final verdict

**Fix 1 (desktop): PASS — blocking cleared. Fix 2 (42vh cap): PARTIAL — mechanism verified, tall phones fine, but the stated 360×740 goal (tappable editor → auto-collapse) is not met; sticky+cap ≈ full scrollport there.** Whether R1-3 blocks the PR is a product call: accept + document it like the 667 case, or tighten the cap (≤38vh / `calc(42vh − 80px)`) to actually free a band on ~740px phones. No regressions found anywhere else; the mobile experience keeps all its Round-1 wins (+259px @375×667, +264px @360×740, guard semantics, instant retro collapse, zero overflow).

---

---

# Round 1 (historical) — original report, 2026-09-27 (pre-fix)

**Branch:** `feat/collapsible-editor-toolbar` — collapsible style toolbar in `components/editor/RetroEditor.tsx` (hook `useCollapsibleToolbar.ts`, covered by 17 unit tests — this report tests the **visual result** only)
**Harness:** `layout-test.mjs` — standalone Playwright (1.61) reconstruction of the RetroEditor modal via `page.setContent`, following the merged `fix-editor-scrollable` pattern. The hook semantics (collapsed by default <768px, handle toggle, 800ms grace window, focus auto-collapse, pointerdown-on-sticky touch) are simulated in plain page JS exactly as implemented.
**Dev server:** not running (and the app is auth-gated with no test credentials) → standalone reconstruction, per the task's prescribed method.

## Summary

|                        |                                                                                             |
| ---------------------- | ------------------------------------------------------------------------------------------- |
| Automated checks       | **48 / 52 PASS**                                                                            |
| Screenshots            | 14 PNG                                                                                      |
| **Blocking findings**  | **1** (desktop regression: `md:hidden` defeated by CSS cascade)                             |
| **Important findings** | **2** (expanded toolbar fully covers the editor on 375×667 and 360×740 phones)              |
| **Nit findings**       | **2**                                                                                       |
| Mobile feature itself  | **PASS — works as designed, big screen-space win, retro look intact, instant collapse**     |
| Desktop requirement    | **FAIL — "desktop: NOTHING changed" is not met; handle is visible AND clickable at ≥768px** |

### Verdict

**FAIL — one blocking finding must be fixed before merge.** The mobile experience this PR was built for is excellent and fully verified (collapsed-by-default, full-width ≥44px handle, +259px of visible editor on a 375×667 phone, guard semantics, instant retro collapse, zero horizontal overflow at 375 and 360, sticky handle always reachable). But the desktop promise of the branch ("NOTHING changed on desktop, handle is `display:none`") is broken by a CSS cascade rule: the component's unlayered `<style>` block beats Tailwind v4's layered `md:hidden` utility, so the handle **renders and works on desktop** — a new clickable element that can collapse the desktop toolbar.

---

## Method & fidelity notes

1. **DOM**: reconstructed with the exact class strings of the current `RetroEditor.tsx` (header w/ title + 🌍 Public/🔒 Privé, sticky toolbar block, handle `retro-btn tool-btn styles-handle md:hidden`, conditional region `#retro-style-toolbar` with all 26 buttons + 2 selects + color input + 6 swatches + 3 separators, media row 🖼️ Photos/🎬 Vidéo/🎵 Son/💬 GIF/🎙 Voix, `editor-area min-h-[280px]`, footer 💾 Publier/Annuler).
2. **Cascade**: reproduced **faithfully, not approximately**. Tailwind utilities are wrapped in `@layer utilities` — verified against the real compiled chunk `.next/static/chunks/1f_secfud2xst.css`, where `.md\:hidden{display:none}` sits inside `@layer utilities` / `@media (min-width:48rem)`; the retro classes of `globals.css` and the component's `<style>` block are **unlayered** (custom CSS after `@import "tailwindcss"`, runtime style tag). This fidelity is what surfaced the blocking finding.
3. **Hook simulation**: `toolbarOpen=true` initial → `apply(matchMedia("(max-width:767px)"))` → mobile collapsed / desktop open; handle click toggles; `pointerdown` on the sticky block sets `lastTouch`; editor `focus` collapses when `isMobile && now - lastTouch > 800ms`. Region mount/unmount is synchronous (React conditional render).
4. **Realistic tapping**: with the toolbar expanded the editor can sit below the fold of the middle scroll container — `tapVisible()` scrolls the middle (what a phone user does) and taps the editor in the band below the sticky block. When no band exists, that fact itself is measured and reported (see findings).
5. Timing of the 800ms guard is real (explicit `waitForTimeout(900)` for expiry, immediate tap for the hold case); no clock stubbing needed.
6. This test session has no image-reading capability, so "visual" verification below combines `getComputedStyle` + `getBoundingClientRect` assertions with **PNG pixel sampling** at the measured handle coordinates (see Retro aesthetic check).

---

## Measurements — mobile 375×667 (primary)

Boxes are `getBoundingClientRect()` in CSS px; "visible" = intersection with the viewport (editor content inside the middle scrollport is additionally clipped at `middle.bottom`).

| Step                            | Element               | Box                            | Status    | Notes                                                                                                                                            |
| ------------------------------- | --------------------- | ------------------------------ | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| collapsed (default)             | styles handle         | x34.4 y247.5, **302×50.8**     | PASS      | ≥44px touch target, full width of sticky content box (302px), inside modal box & viewport                                                        |
| collapsed                       | style region          | —                              | PASS      | **not in DOM** (`toolbarOpen=false` on load)                                                                                                     |
| collapsed                       | handle label / a11y   | —                              | PASS      | `🎨 Styles ▼`, `aria-expanded="false"`, `aria-controls`, `title` present                                                                         |
| collapsed                       | editor-area           | height 280 (min-h)             | PASS      | **258.7px visible** in viewport                                                                                                                  |
| collapsed                       | 💾 Publier            | 111.9×44                       | PASS      | in viewport & inside box (footer pinned)                                                                                                         |
| collapsed                       | media row             | —                              | PASS      | 💬 GIF / 🎙 Voix reachable with styles collapsed                                                                                                  |
| collapsed                       | page overflow         | docScrollWidth 375             | PASS      | no horizontal scroll                                                                                                                             |
| expanded (after handle tap)     | style region          | 302×**263** (≈8 rows)          | PASS      | 26 buttons + 2 selects + 1 color input all mounted; wraps, no clip; real-app fonts wrap taller (prev-task ground truth: 11–13 rows ≈ 440px @375) |
| expanded                        | handle                | 302×50.8                       | PASS      | label `🎨 Styles ▲`, `aria-expanded="true"`                                                                                                      |
| expanded                        | sticky block          | 322.3×**341.8**                | —         | taller than the middle scrollport (324.1px) → see finding F2                                                                                     |
| expanded                        | editor visible height | **0px**                        | ⚠ finding | editor fully below the fold; tappable band **−35.7px** (sticky.bottom 579.3 ≥ middle.bottom 561.6)                                               |
| expanded                        | 💾 Publier            | 44px visible                   | PASS      | footer always visible — never pushed out                                                                                                         |
| expanded                        | overflow              | doc 375, region maxRight 336.6 | PASS      | nothing exceeds the sticky box; no page overflow                                                                                                 |
| middle scrolled to bottom       | handle                | top 229.5, in viewport         | PASS      | **sticky works** — handle stays reachable while scrolled (top ~8px clipped in this state, see N2)                                                |
| collapse (handle tap)           | timing                | **0.2ms** unmount              | PASS      | **instant** — synchronous conditional unmount, no animation on the region (`transitionDuration 0s`), authentic 2000s behavior                    |
| collapsed again                 | editor visible        | 258.7px                        | PASS      | element height stable 280px → 280px, no reflow damage                                                                                            |
| guard (375×812 flow, see below) | toolbar state         | —                              | PASS      | B tap + immediate text tap → stays open (167ms < 800); after 900ms → text tap collapses (1279ms)                                                 |

**Screen-space savings (the point of this PR):**

| Viewport                             | Visible editor, expanded | Visible editor, collapsed | **Δ win**    |
| ------------------------------------ | ------------------------ | ------------------------- | ------------ |
| 375×667                              | 0px                      | 258.7px                   | **+258.7px** |
| 375×812 (focus-driven auto-collapse) | 125.4px                  | 280px                     | **+154.6px** |
| 360×740 (Android)                    | 0px                      | 264px                     | **+264px**   |

Note: at 375×667 the "auto-collapse on editor focus" step of the prescribed flow **cannot physically happen** — see finding F2. The collapse at that size was exercised via the handle (the user's actual escape hatch), and the focus-driven flow was verified at 375×812 (project's established tall-phone viewport), where it works exactly as designed.

## Measurements — mobile 360×740 (Android)

| Element                          | Box / value                                 | Status       | Notes                                                                |
| -------------------------------- | ------------------------------------------- | ------------ | -------------------------------------------------------------------- |
| collapsed default                | region not in DOM, handle 51px, in viewport | PASS         |                                                                      |
| expanded region                  | 288×**304**                                 | PASS         | all 26 buttons, doc width 360 (no overflow)                          |
| expanded editor band             | **−11px**                                   | ⚠ finding F3 | sticky.bottom 624 ≥ editor top 636; editor untappable while expanded |
| 💾 Publier                       | visible in both states                      | PASS         |                                                                      |
| handle collapse → editor visible | 0 → 264px                                   | PASS         | Δ **+264px**                                                         |

## Measurements — desktop 1280×800

| Element            | Box / value                                                                     | Status                | Notes                                                                                                                                           |
| ------------------ | ------------------------------------------------------------------------------- | --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| style toolbar      | open by default, 26 buttons + 2 selects, region 706×111 (wraps like old layout) | PASS                  |                                                                                                                                                 |
| 💾 Publier         | 111.9×44 at y697, in viewport                                                   | PASS                  | no overflow (doc ≤1280)                                                                                                                         |
| breakpoint re-eval | stays open                                                                      | PASS                  | matchMedia change → `toolbarOpen = !mobile` keeps desktop open                                                                                  |
| **styles handle**  | **706×50.8 at y277.4, computed `display:flex`**                                 | **FAIL — finding F1** | **expected `display:none`**; `md:hidden` (layered utility) loses the cascade to the unlayered `.retro-btn.tool-btn.styles-handle{display:flex}` |
| handle pixels      | `#f8138f`→`#a70062` sampled in PNG                                              | FAIL (confirms F1)    | the pink handle is visibly rendered above the toolbar in `editor-desktop-unchanged.png`                                                         |

### Cascade probe (isolated, exact rules from the live app)

| Probe                     | Classes                                      | Computed display @1280 | Meaning                                                                  |
| ------------------------- | -------------------------------------------- | ---------------------- | ------------------------------------------------------------------------ |
| A — the real handle       | `retro-btn tool-btn styles-handle md:hidden` | **`flex` (1232×51)**   | `md:hidden` defeated by the unlayered component CSS                      |
| B — utility alone         | `md:hidden`                                  | `none`                 | the media query + layering work fine in isolation                        |
| C — any unlayered display | `retro-btn md:hidden`                        | `inline-block`         | ANY unlayered display rule (even `.retro-btn`) beats the layered utility |

Mechanism (CSS Cascade Level 5): normal declarations not in any `@layer` sort **after** (i.e. win over) layered declarations, regardless of specificity. Tailwind v4 emits all utilities (incl. `md:hidden`) inside `@layer utilities`; `RetroEditor`'s `<style>` tag and the retro classes of `globals.css` are unlayered. Verified in the compiled CSS chunk that `.md\:hidden{display:none}` is indeed nested in `@layer utilities`.

Functional consequence beyond looks: `onClick={toggleToolbar}` is bound regardless of viewport — on desktop this visible button lets a user **collapse the style toolbar**, which nothing re-opens automatically (auto-collapse/auto-open is mobile-only). That is a behavior change on desktop, not just a stray pixel.

---

## Retro aesthetic check

- [x] **Handle gradient**: `linear-gradient(180deg, rgb(255,20,147), rgb(160,0,94))` — exactly `#ff1493 → #a0005e`; PNG pixels sampled at the handle: `#fc1491` (top) → `#a1005f` (bottom). Not a modern flat button.
- [x] **3px outset #ffb6d9 border** (computed `outset 3px rgb(255,182,217)`), **999px pill radius**, **bold (700) white text**, `text-shadow 1px 1px 2px rgba(0,0,0,.6)`, glow `box-shadow` incl. `rgba(255,20,147,…)`.
- [x] **Labels**: `🎨 Styles ▼` collapsed / `🎨 Styles ▲` expanded (byte-exact), with `title`, `aria-expanded`, `aria-controls`.
- [x] **Instant collapse/expand**: 0.2ms synchronous unmount, zero transition/animation on the region — authentically 2000s. (The 0.08s ease on `.tool-btn` is the pre-existing press effect on the buttons themselves, imperceptible.)
- [x] **Sticky handle**: stays at the top of the middle scroll container while scrolled (reachable at all times on mobile).
- [x] **No overflow**: `docScrollWidth` = 375 / 360 exactly in both mobile states; toolbar wraps (`flex-wrap`), nothing exceeds the sticky box or the 90vh modal.

_(Caveat: this session cannot view images — aesthetic confirmation is via computed styles + PNG pixel sampling above; the 14 screenshots are available for human review.)_

---

## Findings

### Blocking

1. **[BLOCKING] desktop — styles handle — `md:hidden` is defeated by the CSS cascade, handle is visible and clickable at ≥768px.** Computed `display:flex`, box 706×50.8 in the modal (probe A: 1232×51 standalone). Evidence: desktop metrics + `cascade-probe-desktop.png` + `editor-desktop-unchanged.png` (pink pixels `#f8138f`/`#a70062` at the handle position) + compiled-CSS layer verification. This breaks the branch's explicit desktop requirement ("NOTHING changed") and adds a new desktop interaction (toolbar can be collapsed by clicking the stray handle, with no auto-recovery). Severity: **blocking for this PR**. Suggested directions for the fix PR (advice only — this agent is read-only): (a) minimal diff — append to the same unlayered `<style>` block: `@media (min-width: 768px) { .retro-btn.tool-btn.styles-handle { display: none; } }` (same specificity as the `display:flex` rule, later + media → wins), or (b) move the component's custom CSS into `@layer components` so Tailwind's `utilities` layer (sorted after `components`) wins naturally.

### Important

2. **[IMPORTANT] 375×667 — editor — expanded toolbar covers the ENTIRE middle scrollport.** Sticky block 341.8px vs scrollport 324.1px → tappable band **−35.7px** (sticky.bottom 579.3 ≥ middle.bottom 561.6; editor [591.3..771.3] fully covered). While expanded, the editor is invisible and untappable, so **auto-collapse-on-focus can never trigger at this phone height** — the only exit is the 🎨 Styles ▲ handle (which remains visible & sticky, verified). The collapsed-by-default state (this PR's core goal) is what saves the UX here: users write with +259px of editor. Inherent to the feature's size (~530px toolbar per the hook's own JSDoc) rather than a regression — the old always-open layout had it worse — but worth documenting in the UX, or capping the expanded region (e.g. `max-h` + internal scroll on `#retro-style-toolbar`) so the editor keeps a tappable band on short phones.
3. **[IMPORTANT] 360×740 — editor — same coverage.** Band **−11px** (sticky.bottom 624, editor top 636, middle.bottom 631). Identical conclusion: while expanded at this Android size, the editor is untappable; handle is the only exit. At 375×812 a 94.8px band exists and the full auto-collapse + guard flow works perfectly — auto-collapse is effectively a tall-phone-only rescue.

### Nit

4. **[NIT] 375×667 expanded + scrolled to bottom — top ~8px of the handle button are clipped** (oversized sticky overhangs the scrollport top by 18px; Chromium aligns it to the containing-block bottom). Tappable height drops to ~42.8px in this specific state (still fine in practice). Only occurs while the toolbar is expanded on short phones.
5. **[NIT, pre-existing] toolbar swatches & color input are ~20px touch targets** (`h-5 w-5` swatches, `h-7 w-9` color input) — below the 44px guideline. Not introduced by this branch (same in the old layout); noting for completeness.

---

## Screenshots

- `editor-collapsed-mobile.png` — 375×667, default: collapsed, handle `🎨 Styles ▼`
- `editor-expanded-mobile.png` — 375×667, after handle tap: full 26-button toolbar, editor pushed below fold
- `editor-expanded-covers-editor-667.png` — evidence for F2 (no editor band at 667)
- `editor-expanded-scrolled-mobile.png` — sticky handle stays reachable while middle scrolled
- `editor-autocollapse-mobile.png` — 375×667 after collapse (writing area recovered, +259px)
- `editor-autocollapse-812.png` — 375×812, true focus-driven auto-collapse
- `editor-guard-stays-open-mobile.png` — 375×812, B tap + immediate text tap: toolbar stays open (guard)
- `editor-guard-expires-mobile.png` — 375×812, after 900ms: text tap collapses
- `editor-collapsed-360.png` / `editor-expanded-360.png` / `editor-autocollapse-360.png` — 360×740 Android flow
- `editor-desktop-unchanged.png` — 1280×800: **shows the F1 regression** (pink handle rendered above the toolbar)
- `cascade-probe-desktop.png` — isolated cascade proof (A visible / B hidden / C inline-block)

Artifacts: `layout-test.mjs` (harness), `metrics.json` / `metrics-partial.json` (all raw measurements).
