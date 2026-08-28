---
task_id: user-creation-model
date: 2026-08-28
type: docs
area: auth/invites
tags: [auth, users, supabase-auth, profiles, invite-codes, birthday_girl, rls, two-layer-identity]
status: reference
branch: feat/invites-multiuse
related_files:
  - app/api/auth/signup/route.ts
  - app/(gate)/inscription/page.tsx
  - lib/types.ts
  - supabase/migrations/0001_init.sql
decisions:
  - two-layer-identity
  - role-from-invite-code
  - email-confirm-true
  - service-role-only-invites
---

# Référence: modèle de création des utilisateurs (Skyblog 30 ans)

Note conceptuelle (pas une implémentation) capturée lors de la question « comment créer les
utilisateurs ». Utile pour toute tâche future sur l'auth / les comptes.

## Summary

Un « utilisateur » du projet est une **identité à deux couches** : (1) un utilisateur Supabase Auth
(email + password) et (2) une ligne `profiles` (`id = auth.users.id`, pseudo, `role`, bio, mood,
skin). Le code de la plateforme crée les deux couches ensemble via la clé `service_role` ; les amis
ne s'inscrivent jamais directement, ils passent par la porte à code d'invitation.

## Context / Problem

Le projet est un cadeau surprise : ~10–20 amis invités par code, + un compte spécial `birthday_girl`
(Caroline) qui voit tous les posts (y compris privés) via RLS. Il fallait clarifier « qui crée les
comptes et comment ».

## Decision Points

### DP1 — identité à deux couches

- **choice** : Auth user (Supabase) + row `profiles` liée par `id`. Pas de `profiles` sans Auth user
  (FK `on delete cascade`).
- **rationale** : `profiles` porte les données métier (pseudo, rôle, skin) ; Auth gère le secret
  (mot de passe) hors de portée applicative.
- **alternatives** : tout dans `profiles` avec mot de passe maison → rejeté (ne jamais gérer les
  mots de passe soi-même).

### DP2 — qui crée les comptes

- **choice** : les amis s'auto-inscrivent via `/inscription` avec un code ; Caroline utilise un code
  à `role = 'birthday_girl'`. Aucune création manuelle de comptes en prod.
- **rationale** : la porte à code (= `invites`) reste le seul point d'entrée ; le `role` vient du
  code, donc un même flux sert friend et birthday_girl.

### DP3 — table `invites` service-role-only

- **choice** : `invites` a RLS activé **sans aucune policy** → seule la clé `service_role` (bypass)
  peut la lire/écrire. Insertion des codes via SQL Editor Supabase ou script `service_role`, jamais
  depuis le client.
- **rationale** : `PROJECT_PLAN.md` §10 (anti-découverte). Le code ne doit jamais fuiter côté
  navigateur.

### DP4 — `email_confirm: true` à la création

- **choice** : `auth.admin.createUser({ email_confirm: true })` → l'ami peut se connecter
  immédiatement, sans clic de validation d'email.
- **rationale** : projet fermé/surprise, pas de dépendance à la délivrabilité email.
- **tradeoff** : la réinitialisation de mot de passe par email ne fonctionne pas sans SMTP configuré
  dans Supabase Auth. À décider.

## Implementation approach (flux réel)

1. Générer les codes : `insert into public.invites (code, email, role) values ('BESTIE-…','ami@x','friend'), ('PRINCESSE-1', null, 'birthday_girl');`
2. L'ami va sur `/inscription`, saisit pseudo/email/password/code.
3. `POST /api/auth/signup` (service_role) : vérifie le code, `createUser`, `insert profiles`,
   consomme le code.
4. Le client fait `signInWithPassword` et redirige.

## Pitfalls & Environment

- **Pas de trigger** `on auth.users` qui crée automatiquement `profiles`. Donc : créer un utilisateur
  directement dans le dashboard Supabase Auth SANS insérer `profiles` laisse un utilisateur orphelin
  (pas de pseudo/role) qui casse les requêtes dépendantes de `profiles`. Pour les comptes de test,
  passer par le vrai formulaire, ou insérer `profiles` à la main.
- **Contraintes pseudo** : 3–20 caractères `[a-zA-Z0-9_-]` (validé client + serveur).
- **Code single-use à l'origine** : voir `invites-multiuse` — rendu réutilisable ensuite.

## Lessons for future agents

- Pour créer un utilisateur de test : utilise un code d'invitation jetable via le vrai formulaire
  (exerce la porte + RLS). Évite le dashboard Auth seul (profil orphelin).
- Pour le compte Caroline : un code dédié `birthday_girl`, gardé secret comme ses identifiants.
- Si on ajoute un trigger `profiles` auto-create, il faut toujours un `role` par défaut sûr
  (`friend`) ; le `birthday_girl` reste posé explicitement par le flux d'inscription.

## Linked reasoning / similar tasks

- [invites-multiuse](./2026-08-28-invites-multiuse.md) — passage des codes single-use à réutilisables.
- Toute tâche sur `app/api/auth/*`, `lib/invites.ts`, ou les policies RLS de `profiles`/`posts`.
