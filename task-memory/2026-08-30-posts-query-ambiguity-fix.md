---
task_id: posts-query-ambiguity-fix
date: 2026-08-30
type: bug
area: query/rls
tags: [postgrest, supabase, join, ambiguity, coups-de-coeur, profiles, rls, null-data]
status: implemented
branch: feat/local-dev-setup
related_files:
  - app/(site)/page.tsx
  - app/(site)/day/page.tsx
  - app/(site)/profil/[pseudo]/page.tsx
  - app/(site)/posts/[id]/page.tsx
  - supabase/migrations/0001_init.sql
decisions:
  - explicit-fk-relationship-syntax
  - silent-null-instead-of-throw
---

# Task: PostgREST ambiguous relationship breaks all post feeds

## Summary

All queries joining `posts` with `profiles` returned empty data (`null`) because the
`coups_de_coeur` table created a second join path between `posts` and `profiles`.
PostgREST returned error `PGRST201` (ambiguous relationship), but the Supabase JS client
silently returned `null` instead of throwing, making all post feeds show "Aucun post".

## Context / Problem

- The `coups_de_coeur` table has FKs to both `posts` (post_id) and `profiles` (user_id).
- This creates two paths from `posts` to `profiles`:
  1. `posts.author_id → profiles.id` (via `posts_author_id_fkey`)
  2. `posts.id ← coups_de_coeur.post_id → coups_de_coeur.user_id → profiles.id`
- PostgREST can't determine which path to use when the query says `author:profiles(...)`.
- The Supabase JS client returns `{ data: null, error: PGRST201 }` but the page code
  only checks `posts ?? []`, treating `null` as empty.
- Result: home page, day page, profil page, and post detail page all showed no posts.

## Decision Points

### explicit-fk-relationship-syntax

- **choice**: Specify `profiles!posts_author_id_fkey` in all post↔profile joins.
- **rationale**: PostgREST requires explicit relationship hint when multiple paths exist.
  The `!` syntax with the constraint name is the canonical way to disambiguate.
- **alternatives**: Rename the coups_de_coeur FK; create a Postgres view; use RPC.
- **tradeoff**: More verbose select strings, but clear and maintainable.

### silent-null-instead-of-throw

- **choice**: Accept that Supabase JS client returns null on PostgREST errors (library behavior).
- **rationale**: Changing the library isn't feasible. The fix is to write correct queries.
- **alternatives**: Add error checking to every query (defensive).
- **tradeoff**: Future ambiguous queries will silently fail. Consider adding error logging.

## Implementation approach

Changed 4 files, 4 queries:
- `app/(site)/page.tsx` line 18: home feed + line 53: best-of query
- `app/(site)/day/page.tsx` line 25: Caroline's reveal view
- `app/(site)/profil/[pseudo]/page.tsx` line 39: user's mini-skyblog
- `app/(site)/posts/[id]/page.tsx` line 15: single post view

Each changed from `profiles(...)` to `profiles!posts_author_id_fkey(...)`.

The `blab` table is NOT affected (only one FK to profiles).

## Pitfalls & Environment

- **Silent failure**: PostgREST returns error in `error` field, but `data` is `null`.
  Pages that do `data ?? []` see empty array, not an error. This is a footgun.
- **Future tables**: Any new table with FKs to both `posts` and `profiles` will recreate
  this ambiguity. Always check for multiple join paths.
- **Supabase generated types**: If using auto-generated types, the ambiguity might be
  caught at type level — but we're not using them yet.

## Lessons for future agents

- When all post queries return empty but data exists in DB, check for PostgREST ambiguity.
- Test queries directly via REST API: `curl -H "Authorization: Bearer TOKEN" ...`
- The `!constraint_name` syntax is the way to disambiguate PostgREST joins.
- The `coups_de_coeur` table is the source of ambiguity for posts↔profiles.
- Consider adding error logging to catch silent PostgREST failures in production.

## Linked reasoning / similar tasks

- `2026-08-28-invites-multiuse.md`: same Supabase query patterns (RLS, service_role).
- `2026-08-29-r2-storage-and-local-dev.md`: upload route also uses server-side queries.
