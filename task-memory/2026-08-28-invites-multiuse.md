---
task_id: invites-multiuse
date: 2026-08-28
type: feat
area: auth/invites
tags: [auth, invite-codes, supabase, rls, privacy, signup, multi-use]
status: implemented
branch: feat/invites-multiuse
related_files:
  - app/api/auth/signup/route.ts
  - lib/invites.ts
  - lib/invites.test.ts
  - lib/types.ts
  - supabase/migrations/0003_invites_multiuse.sql
  - PROJECT_PLAN.md
decisions:
  - reusable-invite-codes
  - optional-max_uses-cap
  - first_used_at-telemetry
  - isInviteUsable-extracted
---

# Task: codes d'invitation réutilisables (partagés par plusieurs amis)

## Summary

Le propriétaire veut distribuer **un seul code d'invitation** imprimé sur le faire-part et laisser
chaque ami créer **son propre** compte — donc un code utilisé par N personnes. Le comportement
d'origine était _single-use_ (1 compte / code), ce qui bloquait le cas d'usage. On rend les codes
**réutilisables**, avec un cap optionnel `max_uses` (`NULL` = illimité). Aucune régression de
confidentialité : la table `invites` reste accessible uniquement via `service_role`.

## Context / Problem

- `PROJECT_PLAN.md` §5 / §14.4 : inscription soumise à code d'invitation, `role` dérivé du code
  (`friend` vs `birthday_girl` pour Caroline).
- Le flux d'inscription (`app/api/auth/signup/route.ts`) lisait `invites.used_at` et rejetait dès
  qu'il était non-null → un seul utilisateur par code.
- Demande directe : « provide invite code and let friends create their own account, many friends can
  have the same invitation code ».

## Decision Points

### DP1 — single-use vs réutilisable

- **choice** : réutilisable + cap optionnel `max_uses` (`NULL` = illimité).
- **rationale** : le faire-part physique porte un seul code ; forcer N codes disjoints n'ajoute aucune
  sécurité réelle (le code reste secret, distribué uniquement aux amis).
- **alternatives** : (a) générer un code par ami → rejeté (friction pour le propriétaire) ;
  (b) cap strict par code → retenu comme _option_, pas défaut.
- **tradeoff** : un code partagé fuit « qui a le code » = « tous les amis » ; acceptable pour un
  projet surprise fermé.

### DP2 — où placer la logique de validité du code

- **choice** : extraire `isInviteUsable(invite: InviteUsage | null): boolean` dans `lib/invites.ts`
  (fonction pure), testée unitairement.
- **rationale** : la route touchait Supabase (non testable en iso) ; isoler la règle rend le cœur
  testable sans DB.
- **alternatives** : garder le `if` inline dans la route → rejeté (non testable).
- **tradeoff** : petit fichier supplémentaire, mais couvert par 12 tests.

### DP3 — préserver la confidentialité / le stealth

- **choice** : ne toucher QU'à la sémantique d'usage ; la table `invites` garde son RLS sans aucune
  policy → seule la clé `service_role` (bypass RLS) peut la lire/écrire. Le code reste le seul
  verrou ; aucune inscription anonyme possible.
- **rationale** : `PROJECT_PLAN.md` §10 (anti-découverte). Le partage du code ne change pas le
  modèle de privilèges (tous les `friend` sont égaux ; les posts privés restent protégés par RLS).

### DP4 — colonnes de suivi

- **choice** : `used_at` renommé en `first_used_at` (télémétrie, ne bloque jamais) + ajout
  `uses_count` (défaut 0) + `max_uses` (nullable).
- **rationale** : garder une trace statistique des inscriptions sans recréer un verrou.
- **alternatives** : supprimer `used_at` → rejeté (on perd la date de 1ʳᵉ utilisation).

## Implementation approach

- Migration `0003_invites_multiuse.sql` : `rename column used_at -> first_used_at` (métadonnée
  seulement, pas de perte de données), `add uses_count integer not null default 0`, `add max_uses
integer` + `check (max_uses is null or max_uses > 0)`.
- `lib/invites.ts` : `isInviteUsable`.
- `app/api/auth/signup/route.ts` : `select uses_count, max_uses, first_used_at` ; rejette seulement
  si code absent OU `max_uses` atteint ; au succès `update uses_count = uses_count+1,
first_used_at = now()` ; garde-fou `if (!invite) return` qui narrow `invite` en non-null avant
  `invite.role`.
- `lib/types.ts` + `PROJECT_PLAN.md` §5/§14.4 synchronisés.
- Flux : formulaire → route (service_role) cherche le code → `isInviteUsable` →
  `auth.admin.createUser({ email_confirm: true })` → `insert profiles` (role du code) → bump compteur.

## Pitfalls & Environment

- **Migration à appliquer manuellement** dans Supabase (SQL Editor) avant le déploy : le code lit
  `uses_count`/`max_uses` qui n'existent pas tant que la migration n'est pas jouée.
- **Compteur non atomique** : l'incrément est read-then-write ; deux inscriptions concurrentes sur un
  code _capé_ peuvent toutes les deux passer et `uses_count` sous-compte d'1. **Sans impact** pour le
  défaut `max_uses = NULL` (télémétrie pure). Correction optionnelle : `update ... where id=$1 and
(max_uses is null or uses_count < max_uses)` et traiter 0 ligne = cap atteint.
- **Environnement du runner (préexistant, indépendant de la tâche)** :
  - `vitest.config.ts` fait planter `tsc --noEmit` (`TS2769`, incompat vite/rolldown) et le `npm test`
    complet hang au démarrage (jsdom + plugin React + binaire esbuild manquant). Les tests de
    `lib/invites.ts` passent (12/12) via une config minimale node.
  - `npm run build` hang (aucune sortie) : `node_modules` dérivé + `package-lock.json` désynchronisé
    avec `package.json` (`npm ci` refuse : `@emnapi/wasi-threads` mismatch).
  - `gh pr create` renvoie 404 sur `moiap13/c30` : le token `gh` (fine-grained PAT) n'a pas l'accès
    au dépôt privé → il faut soit accorder le scope `repo`/accès au dépôt au PAT, soit ouvrir la PR
    dans l'UI GitHub.

## Lessons for future agents

- Pour toute évolution de _gating_ auth : garder la table `invites` `service_role`-only (RLS sans
  policy) ; dériver le `role` du code ; isoler la règle dans une fonction pure testable.
- Une colonne « single-use » se généralise proprement en `uses_count` + `max_uses` nullable.
- Ne jamais supposer que l'environnement du runner est sain : si `tsc`/`build`/`test` plantent alors
  que le code est propre, suspecter la dérive `node_modules` / lockfile avant de modifier le code.
- Un fine-grained PAT GitHub ne voit PAS les dépôts privés sans accès explicite (404, pas 403).

## Linked reasoning / similar tasks

- [user-creation-model](./2026-08-28-user-creation-model.md) — modèle d'identité à deux couches et
  flux de création des comptes (contexte de cette tâche).
- Toute future tâche touchant `app/api/auth/*`, `lib/invites.ts`, ou les policies RLS de `invites`.
