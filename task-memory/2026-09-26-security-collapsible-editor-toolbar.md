---
task_id: security-collapsible-editor-toolbar
date: 2026-09-26
type: security-review
area: editor
tags: [security, audit, editor, toolbar, xss, rls, stealth, secrets]
status: pass-with-findings
branch: feat/collapsible-editor-toolbar
related_files:
  - components/editor/useCollapsibleToolbar.ts
  - components/editor/useCollapsibleToolbar.test.tsx
  - components/editor/RetroEditor.tsx
  - lib/sanitize.ts
  - proxy.ts
  - .github/workflows/deploy.yml
  - INVITATION_CAROLINE_30.md
decisions:
  - Verdict PASS: the collapsible-toolbar change is pure client-side UI state, zero security regression.
  - IMPORTANT (pre-existing, flagged per checklist): INVITATION_CAROLINE_30.md holds the live invite code BESTIE-30ANS and is NOT gitignored — must be gitignored or moved out of the repo before any commit lands.
  - Prettier drift on 15 unrelated files verified byte-level semantically identical (YAML quotes, JSON EOF newline, md/js reflow) — noise, not risk.
---

# Security review — collapsible editor style toolbar (`feat/collapsible-editor-toolbar`)

## Audited scope

Diff `main...working-tree` (HEAD == main at `1bdc880`, so **the entire change set is uncommitted**):

| File                                                                                                                       | Nature                                                                                                                                                                             |
| -------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `components/editor/useCollapsibleToolbar.ts` (NEW, untracked)                                                              | Pure client hook: matchMedia mobile detection, editor `focus` subscription, 800 ms grace ref, toggle.                                                                              |
| `components/editor/useCollapsibleToolbar.test.tsx` (NEW, untracked)                                                        | 17 Vitest unit tests, mocks `matchMedia` + TipTap `Editor` double.                                                                                                                 |
| `components/editor/RetroEditor.tsx`                                                                                        | Toolbar block restructured: toggle button (static aria attributes), conditional render of style region, `touchToolbar()` guards in 5 handlers, one pure-CSS `.styles-handle` rule. |
| 15 unrelated files (`.github/workflows/deploy.yml`, `task-memory/**`, `.opencode/agent/deployment.md`, `FORCE_REBUILD.md`) | Prettier-only drift — verified below.                                                                                                                                              |

Verification methods: full diff read, `git diff main --name-only` surface scan, deep-normalized JSON comparison for the 3 `.json` files, YAML semantic analysis for the workflow, pattern scan (`dangerouslySetInnerHTML|innerHTML|eval|javascript:|service_role|http|url(|caroline`), `.gitignore`/tracked-status audit, `proxy.ts` gate read, live run of the new test suite (17/17 pass).

## Checklist results (per PROJECT_PLAN §5, §10, and 2026-09-03-editor-scrollable.md posture)

### 1. Sanitizer / XSS surface — CLEAN

- **No `dangerouslySetInnerHTML` added.** The diff introduces zero rendering of HTML. The 3 pre-existing usages (`RetroEditor.tsx:754`, `PostCard.tsx:109/113`) are untouched by the diff hunks and remain gated: `post.content` → `sanitizeHtml()`, `music_embed` → `isSafeIframe()` check first.
- **`lib/sanitize.ts` unchanged** (not in the diff file list — `SAFE_IFRAME_HOSTS`, `sanitizeStyleAttr`, whitelist intact).
- **Toolbar buttons still only call TipTap editor commands** — every handler in the restructured block is byte-identical to the pre-existing `editor.chain().focus()…run()` logic, merely re-indented inside the `toolbarOpen &&` conditional. No new mutation of content, no new HTML path.
- **All aria/title strings are static literals**: `title="Afficher ou masquer la barre de styles"`, `aria-controls="retro-style-toolbar"`, `aria-label="Barre d'outils de mise en page"`, `"🎨 Styles ▲/▼"`. Only `aria-expanded={toolbarOpen}` is dynamic — a local boolean, no user input interpolation.
- **`isSafeIframe` usage around `musicEmbed` unchanged** (DP6 of the 2026-09-03 posture preserved): `handleSave` still sends `music_embed: musicEmbed`, render still gated by `isSafeIframe(musicEmbed)`; hunk ranges don't intersect these lines.
- **Save path invariant**: `handleSave` → `sanitizeHtml(restored)` → Supabase insert/update. Toolbar state cannot alter what is persisted — even a tampered `toolbarOpen` (React devtools) changes nothing about the content pipeline.

### 2. RLS regression scan — NO DB SURFACE TOUCHED (explicit statement)

`git diff main --name-only` contains **zero** files under `supabase/`, `app/api/`, `lib/supabase/`, `proxy.ts`, or `app/`. The only DB interaction anywhere near the diff (`handleSave` in RetroEditor.tsx, RLS-enforced `posts` insert/update) is not modified. Policies from `0001_init.sql` (read posts: public-or-author-or-birthday_girl; write own posts) are untouched by this change.

### 3. Secrets / gitignore — ONE IMPORTANT FINDING (pre-existing file, flagged as required)

- `.env.local` and `.env.deployment` exist on disk with mode 600 and are **properly ignored** (`git status --ignored` shows `!!` for both). `.env.example` is tracked and contains placeholders only. Nothing is staged (`git diff --cached` empty). No token, key, or `.env` value appears anywhere in the diff — the only `secret`/`SUPABASE` hits are GitHub Actions `${{ secrets.* }}` references and doc placeholders (`"..."`).
- **`INVITATION_CAROLINE_30.md` (repo root, untracked)**: confirmed NOT tracked (`git ls-files` fails) and NOT in git history (`git log --all` empty). **But it is NOT covered by `.gitignore`.** It contains: the recipient's name, the public URL, and — critically — the **live shared invitation code `BESTIE-30ANS`** (line 42). The mandated project workflow ends every task with `git add` + commit + push; one `git add -A` / `git add .` commits it. Consequences if committed: the invite code is burnable on any repo exposure (screenshot, shared screen, future repo transfer), and the recipient's name enters git history — nearly irreversible without history rewriting. Stealth §10 requires this never happens. → **Finding I-1.**

### 4. Third-party / CDN check (stealth §10) — CLEAN

- The new CSS rule (`.retro-btn.tool-btn.styles-handle`) uses only `display/align-items/justify-content/width/padding/font-size` — **no `url(...)`, no external fetch**. Mobile hiding is Tailwind's `md:hidden`, no JS media asset.
- No new external URLs, CDN links, or third-party scripts anywhere in the diff. (`http://localhost:3000` hits are pre-existing Playwright harness lines inside task-memory, reformatted.)
- No `robots.ts`, `app/`, or metadata change (no `app/` file in the diff) → `noindex` posture from §14.4 untouched.

### 5. New attack surface reasoning — NO CONCERN (confirmed)

- `window.matchMedia("(max-width: 767px)")`: browser API, SSR-guarded (`typeof window === "undefined"`), reads viewport only, correct listener cleanup. No data egress.
- Editor event subscription: `editor.on("focus")` with `editor.off("focus")` cleanup by exact reference (verified by tests). Handler only reads two local refs and sets local state. `Date.now()` grace window is UI-only — nothing secret-compared, no timing side channel.
- **No gate bypass possible**: the editor modal renders only inside `app/(site)`, which `proxy.ts` protects (unauthenticated → `/login` redirect for all non-gate, non-`/api` paths). The toggle only flips a boolean that conditions JSX rendering; it has no access to data, auth, or the save payload.
- Test file is wired via `vitest.config.ts` (`**/*.test.{ts,tsx}`), never imported by app code → never ships in the client bundle.

### 6. Dependencies — CONFIRMED EMPTY

`git diff main -- package.json package-lock.json` → empty. No new packages.

### 7. Stealth metadata — CLEAN (with one pre-existing observation)

- No robots/metadata/title change in this diff. New code contains **0 occurrences** of the recipient's name.
- The diff text shows 6 case-insensitive hits of the recipient's name: 5 are context lines and 1 is a prettier-reflowed **pre-existing** line in `task-memory/2026-09-21-deploy-vercel-domain.md` (byte-identical content re-indented) — content already on `main` in the private repo, not a new leak.
- Pre-existing (NOT caused by this change): the production domain `caroline-30.fun` embeds the recipient's name, in tension with §4 "URL obscure" / §10. Documented decision from 2026-09-21; see Nit N-2.

### Prettier-drift verification (15 unrelated files) — SEMANTICALLY IDENTICAL

- `.github/workflows/deploy.yml`: single→double YAML quotes (`'22'`→`"22"`, `'--prod=false'`→`"--prod=false"`) — identical strings in YAML semantics; plus one EOF newline added. **No workflow logic, secret wiring, or trigger change.**
- `focus-test.json`, `raw-results.json`, `metrics.json`: deep-normalized (sorted keys) parse comparison → **identical**; diffs are trailing-newline only.
- `.mjs` harnesses (`measure.mjs`, `clean.mjs`, `compare*.mjs`, `carousel-overflow.mjs`): arrow-fn parens, object-literal expansion, and ternary reformatting only; operator-precedence analysis of the reflowed ternaries (`s ? a || b : false`) confirms identical parse. The `innerHTML` calls inside them are pre-existing synthetic test-HTML injection into a local Playwright page.
- Markdown/REPORT files + `.opencode/agent/deployment.md` + `FORCE_REBUILD.md`: table re-alignment, `_italic_` normalization, blank line — content-equal.

### Behavioral spot-check

`npx vitest run components/editor/useCollapsibleToolbar.test.tsx` → **17/17 passed** (29 ms). Covers: mobile auto-collapse default, desktop never-collapsed, manual toggle, grace-window boundary (exactly 800 ms stays open — strict `>`), breakpoint crossings forcing state, editor lifecycle re-subscription, cleanup by exact handler references (StrictMode-safe).

## Findings

### Blocking — 0

None.

### Important — 1

**I-1 — `INVITATION_CAROLINE_30.md` holds the live invite code and is not gitignored** _(pre-existing file, flagged per audit instructions; risk concretely elevated by this branch's mandated commit+push workflow)_

- **Repro**: `grep -n "BESTIE" INVITATION_CAROLINE_30.md` → line 42: ``**`BESTIE-30ANS`**``. `git check-ignore INVITATION_CAROLINE_30.md` → no match (exit 1).
- **Impact**: accidental `git add -A` (common in the agent pipeline's step "commit → push") commits the burnable invite code + recipient's name to the repo; removing it later requires history rewrite. Violates §10 stealth if the repo is ever exposed.
- **Minimal fix** (1 line, to add in this PR before merge — outside my write scope): append `INVITATION_CAROLINE_30.md` to `.gitignore` (or move the file out of the repo — the plan §10 suggests a physical card anyway). Optionally rotate the invite code before day J if it ever touches a commit.

### Nit — 3

**N-1 — Prettier drift inflates the PR with 15 semantically-neutral files.** Verified identical, but it buries the real change (a ~270-line RetroEditor re-indent) and invites review fatigue. Suggestion: land the drift as a separate `chore(format)` commit or restore those files here (`git checkout -- <files>`), keeping the feature diff minimal.

**N-2 — Pre-existing, out of this diff's scope: production domain `caroline-30.fun` contains the recipient's name** (§4 "URL obscure" vs §10). If she ever searches her own name or the domain, the surprise is at risk; the name is also visible in WHOIS and in repo docs. Decision already documented in 2026-09-21 task memory — recommend the human re-weighs before day J (e.g., obscure `*.vercel.app` URL as canonical for the reveal, keep noindex everywhere, no inbound links anywhere she could encounter).

**N-3 — `handleAddMusic` lacks the `touchToolbar()` guard** that `handleAddVideo`/`handleLink`/color/font/size handlers received. Purely cosmetic (a long-open Spotify picker followed by editor focus may re-collapse the toolbar mid-interaction on mobile). Zero security impact; noted for UX completeness.

## Verdict

**PASS — approve for merge (contingent on I-1 remediation before the branch's commit lands).**

The collapsible toolbar is a pure client-side UI-state change: no new HTML rendering path, no sanitizer/API/RLS surface touched, no dependencies, no external URLs, no metadata/stealth regression, and it cannot bypass the `proxy.ts` auth gate or alter the sanitized save pipeline. The single Important finding concerns a pre-existing untracked file (`INVITATION_CAROLINE_30.md` with the live invite code) that must be gitignored before any commit on this branch — a one-line fix. Prettier drift on unrelated files is verified semantically identical (recommend isolating it for review hygiene). Standing posture from 2026-09-03 (sanitize-whitelist, `isSafeIframe` gate, oEmbed host allowlist) is fully preserved.

_Report generated by the security agent (read-only). Verification artifacts: full diff audit, normalized JSON comparison, 17/17 unit tests passing, gitignore/tracked-status checks._
