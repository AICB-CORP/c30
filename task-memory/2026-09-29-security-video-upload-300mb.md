---
task_id: security-video-upload-300mb
date: 2026-09-29
type: security
area: media/upload
tags: [security, r2, presigned, sigv4, stealth, invites]
status: implemented
branch: feat/video-upload-300mb
related_files: [lib/r2.ts, components/media/MediaUpload.tsx, app/api/upload/route.ts, supabase/migrations/0004_invitation_codes.sql]
decisions: [DP3-signable-headers, DP4-no-server-cap]
---

# Security review — feat/video-upload-300mb (agent report, integrated)

Reviewer: security agent (read-only). Verdict: **diff itself safe to merge, 0 blocking diff-introduced findings**, F2 fixed in-branch, F1 is pre-existing and urgent.

## Findings table

| # | Severity | Introduced by diff? | Finding | Resolution |
|---|----------|--------------------|---------|-----------|
| F1 | **BLOCKING (project)** | No — pre-existing on main | Live invite codes (`BESTIE`, `PRINCESSE`=birthday_girl, both `max_uses=NULL`) tracked on the **public** repo (`supabase/migrations/0004_invitation_codes.sql`); prod URL `c30-eight.vercel.app` in repo About → anyone can sign up as birthday_girl and read all private posts → surprise-killer | **Needs human action today, outside this PR**: rotate both codes to strong random values (placeholders in tracked files), make repo private, scrub About URL, revisit `caroline-30.fun` (N-2) |
| F2 | Important | Comment claimed it; gap pre-existing | Content-Type NOT part of the presign signature (default `SignedHeaders=host` only) → authenticated user could PUT arbitrary bytes served as `text/html` from `pub-*.r2.dev` | **FIXED in branch**: `signableHeaders: new Set(["content-type"])` in `lib/r2.ts` + test assertion. Mismatched Content-Type now 403s. |
| F3 | Important | Yes (consequence of 300 MB) | No server-side size cap + raw 300 MB videos vs 10 GB free tier (~34 max clips exhaust it); failure mode = writes rejected mid-preparation | Accepted by owner; **follow-up**: weekly Vercel cron `ListObjectsV2` audit (>300 MB alert/delete + usage report) — NOT in this PR |
| F4 | Nit | Yes | TTL 3600 s window | Acceptable, functionally required; optional `IfNoneMatch:"*"` single-shot hardening rejected (breaks transparent retry) |
| F5 | Nit | No | `supabase/.temp/**` tracked (incl. `docker.env`, local-only secrets) | Follow-up: gitignore `supabase/.temp/` + `git rm -r --cached` |
| F6 | Nit | No | `.gitignore` misses `.env.production` | Follow-up: `.env*` with `!.env.example` |
| F7 | Nit | No | `/api/upload` validates `bucket` but ignores it (single physical bucket) — false per-bucket isolation signal | Follow-up: drop param or plumb through |
| F8 | Nit | Yes | Stray blank line `MediaUpload.tsx:193` | **FIXED in branch** |

## Key verified facts (don't re-research)

- Default SigV4 presign signs ONLY `host`; Content-Type must be added via `signableHeaders` (verified empirically with this repo's `@aws-sdk/*`; `unhoistedHeaders` ineffective).
- R2 does **not** implement S3 POST policies → no `content-length-range` server-side size enforcement on R2.
- Attack surface delta of 300 MB vs 50 MB ceiling: **effectively zero** — client caps were always bypassable by a malicious authenticated user; the practical per-URL ceiling scales with TTL×throughput (750 MB → 4.5 GB @10 Mbps) but `/api/upload` has no rate limit and mints unlimited URLs, so per-URL was never the binding constraint.
- RLS scan: zero RLS/auth files in diff; `posts_select_visible` and friends intact. F1 makes the birthday_girl policy load-bearing — the policy is correct; the invite gate feeding it leaked.
- Secrets scan of diff: clean (test fixtures only). §10 stealth in the diff: clean (no new external URLs, robots/metadata untouched).
- Prod data check (read-only): 3 accounts exist, all created 2026-09-22 (rehearsal day — owner's own test accounts, verify); live codes are `BESTIE`/`PRINCESSE`, NOT `BESTIE-30ANS` (invitation doc stale).

## Full chain of the F1 repro (for the human)

public repo → `0004_invitation_codes.sql` contains live codes → `/api/auth/signup` accepts any code from `invites` and assigns the row's role → registering with `PRINCESSE` yields `birthday_girl` → RLS grants read on ALL posts incl. `is_private`. Plus repo About exposes prod URL directly.
