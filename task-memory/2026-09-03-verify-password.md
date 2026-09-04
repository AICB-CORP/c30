---
task_id: verify-password
date: 2026-09-03
type: feat
area: auth/gate
tags: [password, verify, confirm, validation, register, a11y]
status: implemented
branch: feat/verify-password
related_files: [app/(gate)/inscription/page.tsx, app/api/auth/signup/route.ts]
decisions: [verify-password-ui, live-hint, client-validation-order, server-length-enforcement]
---

# Feature : vérification mot de passe à l'inscription

## Summary

Ajout d'un champ « Confirmer le mot de passe » à `/inscription` pour éviter les fautes de frappe : second input `type password` avec son propre toggle 👁️/🙈, hint live « Les mots de passe ne correspondent pas. » sous le champ, et validation bloquante à la soumission (mismatch → erreur, longueur <8 → erreur) avant l'appel à `/api/auth/signup`. Le mot de passe de confirmation n'est jamais envoyé au serveur, reste en `useState` éphémère, et les deux champs gardent `autoComplete new-password` et les mêmes styles rétro.

## Context / Problem

- Déclencheur : ticket « add in the regsiter page a verify password for allowing users to inter twice the password to be sure there is no typo ».
- Contraintes PROJECT_PLAN §7.1 (auth invite), §8 mobile-first, §15 pipeline (security+layout mandatory), §10 stealth.
- Sans confirmation, une typo sur mobile (10-20 amis, cadeau surprise) crée un compte avec un mot de passe inconnu → bloqué, support manuel.

## Decision Points

### DP1 — UI second champ + toggle séparé

- **choice** : `confirmPassword` + `showConfirmPassword` states, input `id=confirmPassword` `type={show?text:password}` `pr-12` + bouton `h-10 w-10` `absolute right-1` avec `aria-label`/`aria-pressed`, `autoComplete new-password`, placeholder « Retape ton mot de passe », `aria-describedby` conditionnel vers `confirm-error`.
- **rationale** : réutilise le pattern validé du toggle principal (emoji, 40px, pr-12, focus ring) → cohérence, 0 dépendance.
- **alternatives** : un seul toggle pour les deux champs → moins flexible (l'utilisateur veut parfois voir l'un pas l'autre).
- **tradeoff** : un bouton de plus, mais 2×40px reste <44 HIG, acceptable.

### DP2 — Hint live vs erreur banner

- **choice** : hint live sous le champ confirm (`{confirmPassword && password !== confirmPassword ? <p id="confirm-error">…</p> : null}`) + `aria-describedby`, plus `setError` banner bloquant à la soumission si mismatch.
- **rationale** : feedback immédiat sans attendre le submit, tout en gardant la validation bloquante côté submit pour le cas où l'utilisateur n'a pas vu le hint.
- **alternatives** : seulement banner → moins réactif ; seulement hint → pas bloquant si JS désactivé (mais form required).
- **tradeoff** : double message même texte, mais accessibilité renforcée.

### DP3 — Ordre validation client

- **choice** : `if (password !== confirmPassword) → mismatch` puis `if (password.length < 8) → trop court` avant `setLoading(true)` et `fetch`.
- **rationale** : mismatch est l'erreur la plus fréquente quand on vient de retaper, on la montre d'abord.
- **alternatives** : longueur d'abord → feedback plus rapide sur mot de passe court, mais l'utilisateur qui a tapé `abc`/`def` verrait d'abord longueur alors que mismatch est plus parlant. Les deux sont valides ; garder mismatch d'abord suit l'intuition "les deux doivent être identiques".
- **tradeoff** : si `pwd=abc` / `confirm=abc` (identiques mais courts), l'utilisateur voit d'abord mismatch? Non, il voit longueur au second submit, donc 2 submits. Acceptable.

### DP4 — Ne pas envoyer confirmPassword au serveur

- **choice** : `body: JSON.stringify({ pseudo, email, password, inviteCode })` — `confirmPassword` absent.
- **rationale** : la confirmation est une garde-fou UX, pas une frontière sécurité ; le serveur valide déjà `password.length >=8` et l'invite. Envoyer la confirmation élargirait la surface d'API pour aucun gain.
- **alternatives** : envoyer `confirmPassword` et valider côté serveur si présent → défense en profondeur, mais inutile puisque le client ne l'envoie pas.
- **tradeoff** : un attaquant peut POST directement avec typo et créer le compte, mais c'est standard (confirm est bypassable par design).

## Implementation approach

- **Fichiers clés :**
  - `app/(gate)/inscription/page.tsx` : ajout states, second input avec toggle, hint live, validation mismatch + longueur avant `fetch`, `confirmPassword` jamais dans le payload.
  - `app/api/auth/signup/route.ts` : inchangé (déjà `if (password.length < 8) 400`), `grep confirmPassword` → 0.
- **Flux :** saisie 2 champs → hint live si `confirm && !==` → submit → si mismatch → `setError` banner + `return` (0 fetch) ; si court → banner ; sinon `fetch /api/auth/signup` (1 fetch) → `signInWithPassword`.

## Pitfalls & Environment

- **Bouton `type="button"` obligatoire** : sans, le clic sur l'œil soumet le form.
- **pr-12** : indispensable, sinon `a×50` passe sous l'œil.
- **Validation d'ordre** : le test `mismatch` avant `length` fait que `pwd=abc`/`confirm=def` montre mismatch d'abord, puis après correction `abc`/`abc` montre longueur — 2 étapes, acceptable.
- **Prettier** : `npx prettier --write .` retouche 8 fichiers.

## Lessons for future agents

- Pour une confirmation, toujours hint live + validation bloquante au submit, ne jamais envoyer la confirmation au serveur, garder `autoComplete new-password` sur les deux.
- Garder `pr-12` + `h-10 w-10` pour le toggle, `aria-describedby` conditionnel, `type="button"`.

## Linked reasoning / similar tasks

- task-memory/2026-09-03-password-toggle.md — toggle œil, a11y, pr-12, 40px
- task-memory/2026-09-03-editor-scrollable.md — pipeline durci
