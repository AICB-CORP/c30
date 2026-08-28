---
name: birthday-reveal
description: Use when implementing the day-of experience — Caroline's reveal view, scheduled post release, confetti, story-ordered reading, countdown, pre-birthday and rehearsal checklists. Trigger keywords: reveal, day, birthday, anniversaire, jour J, scheduled, programmé, confetti, countdown, compte à rebours.
---

# Birthday Reveal (jour J)

Source of truth: `PROJECT_PLAN.md` §7.2 (items 3, 7, 10) and §11 (phase 7 rehearsal).

## The reveal flow

1. **Before the birthday**: friends post freely (option a) OR posts scheduled via `posts.scheduled_for` (option b — recommended, single magic moment at 00:01).
2. **00:01 on her birthday**: scheduled posts become visible (cron/edge function or client query filter), confetti rains on the home page.
3. **Caroline logs in** with her account (`role: birthday_girl`): she sees EVERYTHING (all posts, public AND private — RLS grants her full read).
4. **The `day/` view**: dedicated page — welcome message "Bienvenue dans tes 30 ans", confetti (canvas-confetti, free), then posts sorted oldest→newest as a story of her friendships ("complice depuis 2004" badges per friend).

## Implementation notes

- Scheduled release: filter `posts.scheduled_for <= now()` OR `scheduled_for is null` in the read query — no cron needed for the simple version.
- If choosing option (b), the site is effectively empty before D-Day: friends see their drafts scheduled, no one sees anything until 00:01.
- `canvas-confetti`: fire on her first login to `/day` (and a small burst on home at 00:01).
- Mobile-first: the reveal will most likely happen on her phone.

## Pre-birthday checklist

- [ ] All invites sent, all friends have accounts.
- [ ] All content posted (or scheduled) — nothing forgotten.
- [ ] Her account created (role `birthday_girl`), credentials saved for handover.
- [ ] Rehearsal done in production (below).
- [ ] Credentials + URL prepared for physical handover.

## Rehearsal (with qa agent, ~1 week before)

- Create fake friend accounts + one fake "Caroline" account.
- Post public + private + media + embeds test content.
- Verify RLS matrix: anonymous denied, friend sees public only, author sees own private, Caroline sees everything.
- Full mobile pass at 375px/768px.
- Confirm `noindex`/robots still active in production.
- Delete all test accounts and test posts after the run.
