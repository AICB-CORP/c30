---
name: supabase-setup
description: Use when setting up or modifying Supabase — project creation, auth configuration, storage buckets, SQL migrations, RLS policies, free-tier limits, local dev. Trigger keywords: supabase, database, schema, migration, RLS, storage, auth, postgres.
---

# Supabase Setup & Migrations

Source of truth: `PROJECT_PLAN.md` §4 (stack) and §5 (schema + RLS).

## Project creation checklist

1. Create Supabase project (free tier: ~500MB Postgres, 1GB storage, 50k MAU).
2. **Auth settings**: enable Email/Password only; disable anonymous signups; (optionally disable email confirmation for test accounts, keep enabled for production invites).
3. Record `SUPABASE_URL` and `SUPABASE_ANON_KEY` (public, `NEXT_PUBLIC_*`) and `SUPABASE_SERVICE_ROLE_KEY` (server-only, NEVER in client code, NEVER committed).

## Storage buckets

- `avatars` — profile pictures (public read, authenticated write to own folder).
- `post-media` — photos/videos/voice notes (private read via RLS, signed URLs for delivery).
- Client uploads via signed URLs; store relative paths in `post_media.url`.

## Migration workflow

- Versioned SQL files: `supabase/migrations/0001_init.sql`, `0002_...`, etc.
- Idempotent where possible (`create table if not exists`, `create or replace policy`).
- Apply via Supabase CLI (`supabase db push`) or SQL editor for the remote DB.

## Core schema (§5)

Tables: `profiles` (role: `friend` | `birthday_girl`), `posts` (`is_private`, `music_embed`, `scheduled_for`), `post_media`, `blab`, `coups_de_coeur`, `invites`, `visitor_counts`. Indexes on `posts.author_id`, `posts.created_at`, `blab.created_at`, `coups_de_coeur.post_id`.

## RLS — the privacy engine (critical)

- `posts`: public → all friends; private → author OR role `birthday_girl` (Caroline). Writes restricted to `auth.uid() = author_id`.
- `profiles`: read own + others' public fields; update own only.
- Storage buckets: RLS policies matching the above.
- RLS is the ONLY privacy boundary — never rely on client-side filtering.
- Verification SQL: query the matrix as anonymous / friend / author / Caroline (see qa agent).

## Free-tier guardrails

- 1GB storage → compress before upload (target 2–5MB/file, see media-embeds skill).
- No unbounded polling; use realtime for blab only if needed.
- Flag any design that would exceed free limits before implementing.
