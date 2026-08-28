---
name: stealth-privacy
description: Use when working on privacy or the surprise aspect — noindex, robots.txt, invite codes, secret hygiene, RLS audits, anti-discovery, safe credential handover. Trigger keywords: privacy, stealth, secret, noindex, robots, surprise, invitation, invite, anti-découverte.
---

# Stealth & Privacy

Source of truth: `PROJECT_PLAN.md` §10. **The gift depends on Caroline never discovering the site before the birthday.** Every change must preserve stealth.

## Anti-discovery checklist

- `robots.txt`: `User-agent: *` / `Disallow: /` (and no sitemap).
- `noindex` meta tag on every page (layout-level), plus `X-Robots-Tag: noindex` headers where possible.
- Never write Caroline's name or the birthday in titles, metadata, og tags, or page content that search engines or preloaders could surface.
- No analytics/tracking of any kind.
- Obscure URL: random `*.vercel.app` slug or obscure custom domain; no link sharing except via the invitation email/card.

## Invite-code gating

- Signup requires a valid, unused invite code (`invites` table): one code per friend, single use, role assignment (`friend`).
- Codes distributed by the organizer (private message / physical card), never on a public page.
- Caroline's account: created by the organizer with role `birthday_girl`, credentials handed over physically on the birthday.

## Secret hygiene

- `SUPABASE_SERVICE_ROLE_KEY`, Spotify client secret, etc. → server-side env vars only (Vercel project env, NOT `.env` committed).
- `NEXT_PUBLIC_*` only for anon key / Giphy key.
- Verify `.gitignore` covers `.env*`, `.env.local`, etc.

## RLS audit (performed with the security agent)

- Re-audit after ANY schema change: posts, profiles, blab, storage buckets.
- Attack scenarios: friend reads private post (must fail), friend writes to another's bucket folder (must fail), user escalates role (must fail), anonymous reads anything (must fail).

## Handover safety

- Prefer handing the login link/credentials via a physical birthday card rather than texts/emails that could leak.
- If scheduled release is used (§9, option b), posts are invisible until 00:01 — double protection against early discovery.
