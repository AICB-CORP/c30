---
task_id: video-upload-300mb
date: 2026-09-29
type: feat
area: media/upload
tags: [upload, video, r2, presigned, limits, ttl, sigv4]
status: review
branch: feat/video-upload-300mb
related_files: [components/media/MediaUpload.tsx, lib/r2.ts, components/media/MediaUpload.test.tsx, lib/r2.test.ts, lib/imageCrop.ts]
decisions: [DP1-kind-aware-guards, DP2-ttl-3600, DP3-signable-headers, DP4-no-server-cap]
---

# Video upload limit raised 50 MB → 300 MB (kind-aware) + presigned TTL 1 h + Content-Type signing

## Summary

The video upload ceiling was raised from 50 MB to 300 MB at the owner's request so friends can share real phone clips (~2–3 min of 1080p). The previously single global guard became kind-aware (image 50 MB / video 300 MB / audio 50 MB), the R2 presigned PUT TTL went from 600 s to 3600 s (a 300 MB PUT at ~1 Mbps takes ~40 min — the old TTL would 403 mid-upload), and the security review forced a fix: `Content-Type` is now part of the SigV4 signature (`signableHeaders`), closing a pre-existing gap where any authenticated user could PUT arbitrary bytes served as `text/html` off the public R2 origin.

## Context / Problem

- The old limits had **two layers**: a selection-time guard in `processNextInQueue` (`MAX_INPUT_BYTES` = 50 MB, applied to ALL kinds, justified by `browser-image-compression` memory risk — an image-only concern) and an upload-time guard in `uploadSingleFile` (`MAX_RAW_MB` = 50 MB, non-image kinds). Raising only `MAX_RAW_MB` would NOT have worked: videos > 50 MB died at selection with "max 50 Mo" before ever reaching the upload guard.
- PROJECT_PLAN §12 targets 2–5 Mo per clip to stay under the 10 GB R2 free tier; 300 MB is a hard ceiling, not a target. Worst case 20 friends × 5 videos × 300 MB = 30 GB — the free tier can be exhausted by ~34 max-size clips. **Budget risk accepted by owner; needs the follow-up size-audit cron** (see Pitfalls).
- Presigned PUT flow: client POST `/api/upload` → server mints presigned URL (fresh `{uid}/{uuid}.{ext}` key) → client PUTs directly to R2. No server-side size enforcement is possible with R2 (see DP4).

## Decision Points

### DP1 — Kind-aware guards instead of one global limit
- **choice**: `MAX_RAW_MB` became `Record<kind, number>` = `{image:50, video:300, audio:50}`; the selection guard computes `maxInputBytes = kind === "image" ? MAX_INPUT_BYTES : MAX_RAW_MB[kind] * 1024 * 1024`.
- **rationale**: images MUST stay at 50 MB (cropper + `browser-image-compression` read the whole file into memory — that's what `MAX_INPUT_BYTES` protects); audio (2-min WebM voice notes, small music files) has no reason for 300 MB; only video needed the raise. A single global constant would have either kept videos capped or blown up image memory.
- **alternatives**: raise `MAX_INPUT_BYTES` globally (breaks cropper memory assumption); separate `MAX_VIDEO_MB` constant + if/else (equivalent, less table-driven).
- **tradeoff**: two limit knobs to keep in sync; the double-guard redundancy (selection + upload time) remains by design.

### DP2 — Presigned TTL 600 s → 3600 s
- **choice**: `PRESIGNED_URL_TTL = 3600`.
- **rationale**: functional requirement of the 300 MB ceiling: 300 MB at ~1 Mbps ≈ 41 min > 600 s. URL risk is low: fresh unguessable UUIDv4 key per request, content-type signed (after DP3), HTTPS, minted only for authenticated users, replay only overwrites the same key.
- **alternatives**: 7-day max (excessive window), presigned POST with `content-length-range` (NOT IMPLEMENTED by R2 — POST policies absent from the S3 compat matrix, verified by security agent).
- **tradeoff**: longer abuse window per URL, but `/api/upload` already mints unlimited URLs per user, so per-URL window was never the binding constraint.

### DP3 — `signableHeaders: new Set(["content-type"])` on the presign
- **choice**: make Content-Type part of the SigV4 signature (1-line change to `getSignedUrl` options).
- **rationale**: security review F2 proved the claim "content-type-pinned" was FALSE — default signing only covers `host`, so an authenticated user could PUT arbitrary bytes with `Content-Type: text/html`, served as HTML from the public `pub-*.r2.dev` origin (phishing/defacement gadget inside the friend circle, §10 stealth degradation). With `signableHeaders`, mismatched Content-Type → 403. Drop-in because client and presign both use the same normalized type.
- **alternatives**: none viable — `unhoistedHeaders` alone is ineffective (verified empirically by security agent).
- **tradeoff**: a client PUT must send the EXACT presigned Content-Type byte-for-byte; renames/codec params must go through `normalizeContentType` on both sides (they already do).

### DP4 — No server-side size cap (accepted, documented)
- **choice**: client-side caps only, again, for the honest UI; server mints presigned URLs without seeing bytes.
- **rationale**: R2 presigned PUT cannot pin content-length (SigV4 has no length in query/headers; R2 has no POST policies). The limit was already cosmetic against a malicious authenticated user at 50 MB; the threat model (invite-only, ~15–20 trusted friends) makes this acceptable.
- **alternatives / follow-up**: weekly Vercel cron (free hobby tier) running `ListObjectsV2` → alert on + delete objects > 300 MB (grace margin) and report total usage vs the 10 GB budget. ~20 lines. NOT YET IMPLEMENTED — follow-up task.

## Implementation approach

- `components/media/MediaUpload.tsx`: `MAX_RAW_MB` per-kind record (doc comment explains image/audio rationale); selection guard kind-aware; upload guard `MAX_RAW_MB[kind]`; error messages interpolate the per-kind number ("Trop lourd : max 300 Mo." for videos).
- `lib/r2.ts`: TTL 3600 + `signableHeaders`; interface doc now truthful ("valid 1 h, content-type pinned").
- Tests (`MediaUpload.test.tsx`, `r2.test.ts`): video reject at 350 MB (was 60 MB — would now wrongly reject), NEW key regression test "accepts video files between 50 and 300 MB" (250 MB fake passes selection guard → presign → PUT; before the change the global 50 MB guard killed it), error copy test, TTL=3600 + signableHeaders assertions. Fake sizes via `Object.defineProperty(file, "size")` — never allocate real buffers.
- Data flow unchanged: selection guard (drains batch on violation) → `uploadSingleFile` → `/api/upload` presign → PUT to R2 → `publicUrl` inserted into editor content.

## Pitfalls & Environment

- **The selection-time guard is the one users actually hit** — the upload-time guard is unreachable for normal input flow (queue is drained on first violation). Tests must target the selection path.
- **R2 does NOT support S3 POST policies** — the classic `content-length-range` server-side enforcement does not exist on R2. Don't re-research this; the compat matrix (Jul 2026) is the source.
- **Default SigV4 presign does NOT sign Content-Type** — only `host`. `signableHeaders: new Set(["content-type"])` is the fix; `unhoistedHeaders` is ineffective. Verified empirically with this repo's own `@aws-sdk/*` version.
- **Budget math**: ~34 max-size (300 MB) clips exhaust 10 GB R2 free tier. With no payment method, failure mode = writes rejected mid-preparation = friends' uploads silently failing before the birthday. Follow-up cron needed.
- `supabase/.temp/cli-latest` drift (CLI version cache v2.116→v2.118) dirties the tree on CLI runs — discard with `git checkout --`, or better: gitignore `supabase/.temp/` (security nit F5, open).
- 22 pre-existing lint warnings in old screenshot scripts — none introduced here.

## ⚠️ Urgent findings OUTSIDE this task (from security review, pre-existing on main)

- **F1 (BLOCKING, needs human action TODAY)**: repo `AICB-CORP/c30` is PUBLIC; live invite codes (`BESTIE`, `PRINCESSE` = birthday_girl) are tracked in `supabase/migrations/0004_invitation_codes.sql`, both `max_uses = NULL`; prod URL `c30-eight.vercel.app` in repo About. Anyone can sign up as birthday_girl and read ALL private posts before day J → surprise-killer. Fix: rotate both codes to strong random values (placeholders in tracked files only), make the repo private, scrub the About URL, reconsider `caroline-30.fun` domain (contains her name — prior audit N-2).
- **F7 (nit)**: `/api/upload` validates `bucket` but ignores it (single physical bucket) — misleading per-bucket isolation claim.
- **F5/F6 (nits)**: `supabase/.temp/` tracked (local docker secrets — hygiene); `.gitignore` doesn't cover `.env.production`.

## Lessons for future agents

- When a limit exists in TWO layers, find ALL enforcement points before changing the number (grep both constants; here `MAX_INPUT_BYTES` fired before `MAX_RAW_MB`).
- Any change to presigned-URL parameters → verify the claim empirically (sign a URL, inspect `X-Amz-SignedHeaders`) before writing "pinned" in a comment — the security agent caught this diff asserting a false invariant.
- TTL math for big uploads: seconds needed ≈ bytes × 8 / (bitrate of worst user). Design for the SLOWEST mobile uplink, not the dev machine.
- Client-side caps are UX, not security. On R2 there is no free server-side size enforcement via presign; budget for a post-upload audit cron instead.

## Linked reasoning / similar tasks

- task-memory/2026-09-02-video-audio-upload-fix.md — DP3 there raised 8→50 MB; same layers, same budget tension. This task supersedes the 50 MB value for video.
- task-memory/2026-09-01-image-cropper-compression.md — origin of `MAX_INPUT_BYTES` = 50 MB (image-only concern).
- task-memory/2026-09-26-r2-vercel-env-vars.md — R2/Vercel env plumbing for the same upload path.
