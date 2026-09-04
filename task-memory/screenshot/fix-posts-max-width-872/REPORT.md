# Layout Test Report — fix/posts-max-width-872 — 2026-09-04

## Summary

- **Branch:** `fix/posts-max-width-872`
- **Changed files:**
  - `app/(site)/page.tsx` — grid now `mx-auto w-full max-w-[872px]`
  - `components/post/PostCard.tsx` — article now `mx-auto w-full max-w-[872px]`
- **Expected:** Header width is 872 px (max-w-4xl 896 minus px-3×2). Posts grid max 872 centered, gap-6 and sidebar 300 px → posts column ~548 px at desktop. PostCard article max 872 centered. Mobile 375 → full width minus padding, no overflow, centered, max 872. No horizontal scroll, header & posts aligned, retro preserved.
- **Viewports tested:** desktop 1280×800, mobile 375×812, tablet 768×800, mobile 360×800; standalone post detail (1280 & 375)
- **Total screenshots:** 9 (3 required + 6 evidence)
- **Overall verdict:** **CONDITIONAL PASS** — required max-width/centering/alignment works for typical posts (no carousel). **Important** horizontal overflow remains when a post contains a `retro-carousel` (multi-image). The overflow is pre-existing (present in `main` as well) but is amplified by the new max-width context; fix recommended before merge.
- **Retro aesthetic:** preserved (neon, marquee, retro-box, odometer, rainbow, blink)

## Computed styles verification (clean posts — no carousel)

Measured with Playwright against compiled `globals.css` + Tailwind (served from `http://localhost:3000/login`, injected synthetic home mirroring `SiteLayout` + `HomePage` + `PostCard`).

| Viewport | Element | Computed `max-width` | Computed `width` | Rect `w` | `margin` / centering | Status |
|----------|---------|----------------------|------------------|----------|----------------------|--------|
| 1280 | site outer `.max-w-4xl` | `896px` | `896px` | 896 @ x192 centered (192 left/right) | `marginLeft 192px marginRight 192px` (mx-auto) | PASS — outer capped 896, inner 872 |
| 1280 | header `retro-pink-box` | `none` (fills outer minus padding) | `872px` | 872 @ x204 (outer 192 + 12 pad) | — | PASS — 872 = 896−24 |
| 1280 | grid `mx-auto w-full max-w-[872px] gap-6 lg:grid-cols-[1fr_300px]` | `872px` | `872px` | 872 @ x204 | `marginLeft 0 marginRight 0` (mx-auto but w-full fills main 872; visually centered because main 872) | PASS — max 872 enforced |
| 128-0 | grid cols | `gridTemplateColumns: 548px 300px` gap `24px` | — | — | 1fr→548 = 872−300−24 | PASS — posts col ~548 as expected |
| 1280 | postsCol | — | — | 548 @ x204 | — | PASS — matches 1fr |
| 1280 | PostCard `mx-auto w-full max-w-[872px]` | `872px` | `548px` (w-full of col) | 548 @ x204 | `marginLeft 0 marginRight 0` (mx-auto, but col 548 < max, so fills col) | PASS — w-full respects column, max 872 not hit but correctly set |
| 1280 | sidebar | — | `300px` | 300 @ x776 (204+548+24) | — | PASS — 300 px fixed |
| 1280 | standalone PostCard (outside grid) | `872px` | `872px` | 872 @ x204 left/right 204 (centered: `|1280-872-2*204|<2`) | `margin auto` | PASS — detail page centered 872 |
| 375 | site outer | `896px` | `375px` | 375 @ x0 | `0 0` (full viewport) | PASS |
| 375 | header | `none` | `351px` | 351 @ x12 | `12px` padding each side | PASS — 375−24=351 |
| 375 | grid | `872px` | `351px` | 351 @ x12 | `0 0` (w-full fills main 351, max 872 not reached, centered via outer) | PASS — mobile full width minus padding, max 872 respected |
| 375 | grid cols | `351px` (single column, lg breakpoint inactive) | — | — | — | PASS — single column 351 |
| 375 | postsCol | — | — | 351 @ x12 | — | PASS |
| 375 | PostCard | `872px` | `351px` | 351 @ x12 | `0 0` | PASS — full width minus outer padding, max 872 enforced (351 <872) |
| 375 | standalone | `872px` | `351px` | 351 @ x12 | centered | PASS |
| 768 | header | — | `744px` | 744 @ x12 | — | PASS — 768−24=744 |
| 768 | grid | `872px` | `744px` | 744 @ x12 | — | PASS — tablet single column 744 (<872) |
| 768 | grid cols | `744px` | — | — | — | PASS — single column |
| 360 | header | — | `336px` | 336 @ x12 | — | PASS — 360−24=336 |
| 360 | grid | `872px` | `336px` | 336 @ x12 | — | PASS |

No horizontal overflow for clean posts:

- 1280: `documentElement.scrollWidth 1280 == viewport 1280` → **no overflow**
- 375: `375 == 375`
- 360: `360 == 360`
- 768: `768 == 768`

Header vs grid alignment (delta):

- 1280 delta `|872−872| = 0` → PASS
- 375 delta `|351−351| = 0` → PASS
- 768 delta `|744−744| = 0` → PASS
- 360 delta `|336−336| = 0` → PASS

All `mx-auto` and `w-full max-w-[872px]` are applied as specified.

## Per-viewport results — clean posts

| Viewport | Element | Status | Notes |
|----------|---------|--------|-------|
| desktop 1280 | header | PASS | retro-pink-box visible, rounded 12px, pink gradient, centered 872 |
| desktop | grid (posts + sidebar) | PASS | max 872 centered, gap 24, cols 548+300, no overflow |
| desktop | posts column | PASS | 548, PostCards 548, gap retained |
| desktop | PostCard article | PASS | retro-box, border 3px ridge #ff1493, shadow, rounded, max 872 set, w 548 inside grid, 872 standalone centered |
| desktop | sidebar widgets | PASS | 300 sticky, 4 widgets stacked, odometer Press Start 2P |
| desktop | footer | PASS | centered, opacity 70 |
| desktop | no horizontal scroll | PASS | dsw == vw |
| desktop | header/grid align | PASS | both 872 at x204 |
| mobile 375 | header | PASS | 351, wraps, nav flex-wrap, tappable |
| mobile | grid | PASS | single column 351, max 872, gap 24 between posts and sidebar (sidebar stacks below) |
| mobile | PostCard | PASS | 351 full width minus padding, max 872, images max-width 100%, text wraps |
| mobile | sidebar | PASS | stacks below posts, full width 351, no 300 constraint (single col) — correct mobile behavior |
| mobile | no horizontal scroll | PASS | dsw 375 |
| mobile | header/grid align | PASS | both 351 at x12 |
| tablet 768 | grid | PASS | single column 744, no overflow |
| mobile 360 | grid | PASS | 336, no overflow |

## Carousel posts — horizontal overflow (Important)

When a post contains a `.retro-carousel` (flex row with 3 images, `flex:0 0 auto; width:min(280px,70vw)`), the grid column expands beyond its container because `lg:grid-cols-[1fr_300px]` uses `1fr` (= `minmax(auto,1fr)`). The carousel’s intrinsic width (~800–888 px) becomes the column’s min-content, causing overflow.

Measurements with carousel (same branch, same `max-w-[872px]`):

| Viewport | Grid cols (computed) | PostsCol `w` | Carousel `w` / `scrollWidth` / `clientWidth` | `docScrollWidth` vs `vw` | Overflow |
|----------|----------------------|--------------|-----------------------------------------------|---------------------------|----------|
| 1280 | `872px 300px` (expected `548px 300px`) | 872 (expected 548) | car 834 / 888 / 828 (expected car 510 / 888 / 504) | 1400 > 1280 | **FAIL** — sidebar overflows outer (right 1400 >1088), horizontal scroll |
| 375 | `855.5px` (expected `351px`) | 855.5 (expected 351) | car 825.5 / 820 / 820 (expected 321 / 820 / 315) | 868 > 375 | **FAIL** — column 855 > viewport, page scrolls horizontally, posts wider than header (header 351) |
| 768 | `872px` (expected `744px`) | 872 (expected 744) | car 834 / 888 / 828 (expected 706 / 888 / 700) | 884 > 768 | **FAIL** |

**Root cause:** `1fr` does not allow shrinking below auto. Comparison control:

- OLD (main) + carousel @1280: `932px 300px`, col 932, dsw 1460 — same bug, slightly worse (no max-w cap).
- NEW + carousel + `minmax(0,1fr)` fix @1280: `548px 300px`, col 548, car 510/888/504, dsw 1280 — overflow disappears, carousel becomes horizontally scrollable inside PostCard as intended.
- Mobile 375 with `minmax(0,1fr)`: col 351, car 321/820/315, dsw 375 — no overflow.

**Impact:** Any friend posting a multi-photo carousel (the “upload multiple as carousel” feature from `fix/carousel-not-working`) will break mobile layout and desktop alignment. Since carousel is a supported editor feature, this is **Important** (Blocking for carousel users). For posts without carousel, the fix is fully PASS.

The same overflow exists in `main` (tested OLD+carousel → 932px col, dsw 1460), so it is **not introduced** by this branch, but the new `max-w-[872px]` makes the mismatch more obvious (grid capped 872 but column still auto 872). The fix for this branch should ideally include the `minmax(0,1fr)` change to fully satisfy “no horizontal scroll”.

## Screenshots

All screenshots rendered via Playwright against compiled Tailwind+`globals.css` (visited `/login` to load stylesheet, then injected synthetic home HTML mirroring `SiteLayout` + `HomePage`).

Primary (required) — clean posts (no carousel, correct behavior):

- `task-memory/screenshot/fix-posts-max-width-872/home-desktop.png` — desktop 1280×800, header 872, grid 872, columns 548+300, PostCards 548, sidebar 300, no horizontal scroll, centered (file 1280×1406, 331 KB)
- `task-memory/screenshot/fix-posts-max-width-872/home-mobile.png` — mobile 375×812, header 351, grid 351 single column, PostCards 351, sidebar stacks, no horizontal scroll (375×1693, 260 KB)

Additional evidence:

- `home-tablet-768-clean.png` — tablet 768, grid 744 single column, no overflow (768×1933)
- `home-mobile-360-clean.png` — mobile 360, grid 336, no overflow
- `home-carousel-desktop.png` — desktop 1280 with carousel, **overflow 1400** (>1280), grid col 872 instead of 548, sidebar at x1100 overflows outer (1400×800)
- `home-carousel-mobile.png` — mobile 375 with carousel, **overflow 868** (>375), col 855.5 instead of 351 (868×812)
- `home-carousel-tablet.png` — tablet 768 with carousel, **overflow 884** (884×869)
- Legacy overflow captures (pre-clean, same HTML with 3 posts + carousel + 4 widgets): `home-mobile-360.png` (836×2479) and `home-tablet-768.png` (884×2562) — also show overflow, kept for history; `metrics.json` contains full traces for those.

Standalone PostCard test (outside grid, like `/posts/[id]`):

- Desktop 1280: card 872 @ x204 centered, `margin auto`, max 872 respected
- Mobile 375: card 351 @ x12 centered, full width minus padding, max 872 respected

## Retro aesthetic check

| Item | Status | Notes |
|------|--------|-------|
| Pink/neon scheme (#FF69B4, #FF1493, violet, blue) | PASS | `retro-pink-box` gradient #ff1493→#c0006e, `retro-box` gradient #2a0a3d→#16042a, border 3px ridge #ff1493, shadow `0 0 12px rgba(255,20,147,0.45)` |
| Neon text shadow | PASS | `.neon-pink` `0 0 5px #ff69b4, 0 0 10px ..., 0 0 20px #ff1493, 0 0 40px` — measured `textShadow` non-empty at PostCard title |
| Rainbow gradient | PASS | `.rainbow-text` linear-gradient 90deg, `background-clip:text`, animation `rainbow-slide 6s linear infinite` — present in post content |
| Blink | PASS | `.blink` animation `blink 1s step-start infinite` |
| Marquee | PASS | `.marquee` `overflow:hidden`, `white-space:nowrap`, child `animation: marquee 14s linear infinite`, `transform translateX` — measured `overflow hidden`, `whiteSpace nowrap`, marquee at header and inside post (no horizontal page overflow for clean posts) |
| Fonts | PASS | `Dancing Script` loaded (variable `--font-retro-cursive`), `Press Start 2P` for odometer (`.odometer` has `font-family var(--font-pixel)`), fallback `Comic Sans MS` on body — stylesheets 2 loaded |
| GIFs / images | PASS | Post images `max-width:100%`, `border 3px solid #ff69b4`, rounded 8px, flex carousel images `width min(280px,70vw)` — placeholder SVGs render (not broken) |
| Odometer hit counter | PASS | `.odometer` black bg #000, yellow #ff0, inset border, `Press Start 2P`, letter-spacing 0.15em — visible in sidebar |
| Sparkle cursor | PASS | `cursor: url("data:image/svg+xml...") 12 12, auto` on `body.sparkle-cursor` — not screenshot-visible but rule present |
| Tiled glitter bg | PASS | `.tiled-gif-bg` defined (not used on home, but exists) |
| Mobile chaos survives | PASS | Clean mobile 375: single column, `overflow-wrap break-word` on `.post-content`, `flex-wrap` on nav and post headers, no horizontal scroll, tap targets ≥44 px (retro-btn 127×46) |
| `overflow-wrap` for marquee | PASS | `.post-content` has `overflow-wrap break-word; word-break break-word` — long `sans espaces_supercalif...` breaks |
| Border / ridge / shadow | PASS | `retro-box` ridge 3px, radius 12px, pink shadow — preserved at all viewports |

## Issues found

### 1. **[Important]** Carousel causes grid column to overflow, horizontal scroll at all viewports — severity: **Important** (Blocking if carousel is expected to work without scroll)

- **Where:** `app/(site)/page.tsx` grid `lg:grid-cols-[1fr_300px]` with `max-w-[872px]` + any `.retro-carousel` in a post
- **Expected:** Grid `1fr` resolves to `548px` at desktop (872−300−24) and `351px` at mobile 375; carousel scrolls internally (`overflow-x:auto`), page does not scroll horizontally; `docScrollWidth == vw`
- **Actual:** Desktop `1fr→872px`, column 872 instead of 548, `docScrollWidth 1400 >1280`; mobile `351→855.5px`, column 855, `docScrollWidth 868 >375`; tablet `744→872px`, `884 >768`. Sidebar overflows outer box (desktop sidebar at x1100, outer right 1088)
- **Cause:** `1fr` is `minmax(auto,1fr)`; carousel intrinsic width (~888 scrollWidth) becomes min-content. Grid item (`posts-col`) default `min-width:auto` prevents shrinking.
- **Evidence:** `compare2.mjs` and `carousel-overflow.mjs` metrics; screenshots `home-carousel-*.png`; `metrics.json` (pre-clean) shows `noHorizontalOverflow false` and `headerGridDelta 0` but `overflowing` list with sidebar and posts-col right > vw
- **Fix recommended (read-only report, no edit):** Change `app/(site)/page.tsx` from `lg:grid-cols-[1fr_300px]` to `lg:grid-cols-[minmax(0,1fr)_300px]` and add `min-w-0` to the posts column and PostCard (or `min-w-0` on grid and `posts-col`). Example:

  ```tsx
  <div className="mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
    <div className="min-w-0">
      <PostCard ... /> {/* PostCard already has max-w, but ensure inner .retro-carousel parent has min-w-0 */}
    </div>
    <aside className="min-w-0 space-y-4 ...">
  ```

  With that fix, re-measured clean+carousel: desktop `548px 300px`, col 548, car 510/888/504, dsw 1280; mobile col 351, car 321/820/315, dsw 375 — **PASS**. The `.retro-carousel` already has `max-width:100%` and `box-sizing:border-box`; adding `min-w-0` on ancestors is sufficient.
- **Scope:** Exists in `main` as well (OLD+carousel gave `932px 300px`, dsw 1460), so not a regression introduced by this branch, but this branch is an opportunity to fix it. Without fix, the “no horizontal scroll” requirement is not met for carousel posts.

### 2. **[Nits]** `PostCard` `mx-auto` inside grid column is redundant but harmless

- **Where:** `components/post/PostCard.tsx` `className="retro-box mx-auto mb-5 w-full max-w-[872px]"`
- **Expected:** At desktop inside grid, card fills column `548px` (<872), centering not needed; at standalone detail page, centering is desired.
- **Actual:** Inside grid, `mx-auto` with `w-full` of 548 and `max 872` renders as `marginLeft 0 marginRight 0`, width 548 — not centered within column but column itself is already correct width, so visual result is fine. Standalone case correctly centers (left 204, right 1076, delta <2). Harmless, but could be documented as intentional for reuse outside grid.
- **Severity:** Nits — no visual impact.

### 3. **[Nits]** `mx-auto` on grid has no effect at mobile/tablet when `w-full` fills `main` — still correct

- At mobile, grid `marginLeft 0 marginRight 0` but `main` is 351 and grid is 351, so visual centering comes from outer `mx-auto` (site outer centered). At desktop, grid at x204 equals header at x204, so aligned. The `mx-auto` on grid is only effective when `main` is wider than `max-w` (e.g., standalone detail where grid is the container). At current breakpoints it’s correct; at intermediate widths (e.g., 900 px viewport, outer 900, header 876? actually outer max 896, inner 872, grid 872) grid would be centered within main if main >872, but main is outer−24, so grid fills main. No bug.

## Verdict

**CONDITIONAL PASS.**

- **What PASS:** The branch correctly implements the required `max-w-[872px]` + `mx-auto w-full` on both the home grid and `PostCard` article. Verified: `gridMaxIs872 true`, `cardsMaxAre872 true`, header width 872 matches grid 872 (delta 0), desktop posts column 548 (872−300−24) with gap 6 and sidebar 300, mobile full width minus `px-3` (351 at 375, 336 at 360, 744 at 768), standalone PostCard centered 872 at desktop and 351 at mobile, no horizontal scroll for posts without carousel, retro aesthetic fully preserved, tappable targets ≥44, `overflow-wrap` works, fonts and neon intact. Screenshots `home-desktop.png` (1280) and `home-mobile.png` (375) show correct centered 872-max layout without overflow.
- **What needs fixing before merge (Important):** Horizontal overflow when a post contains a `retro-carousel`. Recommend updating `app/(site)/page.tsx` to `lg:grid-cols-[minmax(0,1fr)_300px]` and adding `min-w-0` to `posts-col` (and optionally to `PostCard`/`post-content` wrapper) so the carousel scrolls internally instead of expanding the grid. This fix makes both clean and carousel cases PASS and matches the expected “no horizontal scroll, header and posts align”.
- **No new regressions:** For posts without carousel, the fix reduces max width from previously unconstrained (full outer 872) to same 872 but now explicitly capped and centered — behavior matches spec. For carousel posts, overflow was already present in `main` (932px col), this branch slightly reduces but does not eliminate it; the suggested `minmax` fix resolves it.

## How to verify locally

```bash
# 1. ensure dev server
npm run dev
# 2. run clean check (no carousel)
node task-memory/screenshot/fix-posts-max-width-872/clean.mjs
# expect: 1280 grid 548/300 dsw 1280, 375 grid 351 dsw 375, no overflow
# 3. run carousel overflow check
node task-memory/screenshot/fix-posts-max-width-872/carousel-overflow.mjs
# expect before fix: dsw 1400/868/884 overflow true
# after applying minmax(0,1fr) + min-w-0, re-run → dsw == vw
```

## Files

- `task-memory/screenshot/fix-posts-max-width-872/home-desktop.png` — clean desktop (PASS)
- `task-memory/screenshot/fix-posts-max-width-872/home-mobile.png` — clean mobile 375 (PASS)
- `task-memory/screenshot/fix-posts-max-width-872/home-tablet-768-clean.png` — tablet 768 clean
- `task-memory/screenshot/fix-posts-max-width-872/home-mobile-360-clean.png` — mobile 360 clean
- `task-memory/screenshot/fix-posts-max-width-872/home-carousel-desktop.png` — carousel overflow desktop (FAIL, evidence)
- `task-memory/screenshot/fix-posts-max-width-872/home-carousel-mobile.png` — carousel overflow mobile (FAIL, evidence)
- `task-memory/screenshot/fix-posts-max-width-872/home-carousel-tablet.png` — carousel overflow tablet
- `task-memory/screenshot/fix-posts-max-width-872/metrics.json` — full metrics from initial detailed measure (with carousel overflow)
- `task-memory/screenshot/fix-posts-max-width-872/clean.mjs` / `carousel-overflow.mjs` / `compare*.mjs` — reproducible Playwright harnesses

