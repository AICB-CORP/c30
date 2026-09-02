---
task_id: supabase-key-format-change
date: 2026-08-30
type: bug
area: infra/supabase
tags: [supabase, cli, jwt, api-key, auth, environment, local-dev]
status: implemented
branch: feat/local-dev-setup
related_files:
  - .env.local
  - app/api/auth/signup/route.ts
  - lib/supabase/server.ts
decisions:
  - regenerate-jwt-from-secret
  - env-file-conventions
---

# Task: Supabase CLI key format change breaks local auth

## Summary

After `supabase stop` + `supabase start`, the Supabase CLI generated new PASETO-style
keys (`sb_publishable_*` / `sb_secret_*`) instead of the old JWT tokens (`ANON_KEY` /
`SERVICE_ROLE_KEY`). The `@supabase/supabase-js` client expects JWTs, causing
"Invalid API key" errors on all authenticated endpoints (signup, upload, etc.).

## Context / Problem

- `supabase start` was updated and now outputs new key formats in `supabase status`.
- `.env.local` still had the old JWT keys from a previous `supabase start`.
- The signup route (`/api/auth/signup`) failed with `Invalid Refresh Token: Refresh Token Not Found`
  and `Invalid API key` errors.
- Even after updating `.env.local` with the new keys from `supabase status`, the errors
  persisted because the new keys were PASETO format, not JWT.
- The `.env.deployment` file (remote Supabase) was NOT loaded by Next.js — it's not a
  recognized env file name. Only `.env.local` was loaded.

## Decision Points

### regenerate-jwt-from-secret

- **choice**: Extract JWT secret from Docker container and regenerate anon/service_role JWTs.
- **rationale**: The `@supabase/supabase-js` v2 client requires JWTs. The PASETO keys from
  the new CLI format are incompatible.
- **alternatives**: Downgrade Supabase CLI; update Supabase JS client to support PASETO.
- **tradeoff**: Generated JWTs will break again if `supabase stop`/`start` regenerates keys.
  Mitigation: document the regeneration command.

### env-file-conventions

- **choice**: Keep `.env.local` for local dev, `.env.deployment` as reference only (not loaded).
- **rationale**: Next.js only loads `.env`, `.env.local`, `.env.development`, `.env.production`,
  `.env.development.local`, `.env.production.local`. `.env.deployment` is ignored.
- **alternatives**: Rename to `.env.production` (loaded by `next build`).
- **tradeoff**: Vercel dashboard env vars override file-based env in production.

## Implementation approach

1. Extract JWT secret from Docker: `docker inspect supabase_db_caroline` → `JWT_SECRET`
2. Regenerate tokens with Python script (HS256, role=anon/service_role, exp=far-future)
3. Update `.env.local` with new tokens
4. Restart `npm run dev` (env vars cached at startup)

## Pitfalls & Environment

- **Next.js caches env vars**: Changing `.env.local` requires `npm run dev` restart.
- **Supabase CLI version drift**: Keys may change between CLI updates. Always verify with
  `supabase status` after `supabase start`.
- **Browser session cookies**: Old JWT cookies become invalid when keys change. User must
  log out and log back in.

## Lessons for future agents

- When Supabase auth fails with "Invalid API key", first check if the keys in `.env.local`
  match what `supabase status` outputs.
- If keys are PASETO format (`sb_publishable_*`), regenerate JWTs from the Docker JWT secret.
- `.env.deployment` is NOT loaded by Next.js — it's a reference file for Vercel dashboard config.
- Always restart `npm run dev` after changing `.env.local`.

## Linked reasoning / similar tasks

- `2026-08-29-r2-storage-and-local-dev.md`: same local dev setup, R2 storage migration.
