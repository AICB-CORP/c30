---
task_id: password-toggle
date: 2026-09-03
type: feat
area: auth/gate
tags: [password, toggle, show-hide, login, inscription, a11y, security]
status: implemented
branch: feat/password-toggle
related_files: [app/(gate)/login/page.tsx, app/(gate)/inscription/page.tsx]
decisions: [password-toggle-ui, a11y-aria, touch-target-40, autocomplete-preserve]
---

# Feature : toggle afficher/masquer mot de passe (login & inscription)

## Summary

Ajout d'un bouton œil 👁️/🙈 pour afficher/masquer le mot de passe sur `/login` et `/inscription`. Le mot de passe reste masqué par défaut (`type=password`), un clic bascule vers `type=text` et inversement, sans perte de valeur, sans soumettre le formulaire, avec `aria-label` dynamique, `aria-pressed`, `pr-12` pour ne pas masquer le texte, et styles rétro cohérents. Vérifié 40px touch, 48px padding, pas de débordement, autocomplete préservé, 0 fuite secret.

## Context / Problem

- Déclencheur : ticket « add password toggle for show hide password in login and register ».
- Contraintes PROJECT_PLAN §2 stealth (pas de fuite), §4 zero-budget, §7.1 auth (email+password+code), §8 mobile-first, §15 workflow (security+layout mandatory).
- L'absence de toggle obligeait à retaper à l'aveugle sur mobile, UX frustrante pour 10-20 amis invités.

## Decision Points

### DP1 — UI toggle eye emoji vs SVG

- **choice** : emoji `👁️` (masqué) / `🙈` (visible) dans `<span aria-hidden>`, bouton `h-10 w-10` (40px) `pr-12` sur input, `absolute right-1 top-1/2 -translate-y-1/2`, `hover:bg-white/10`, `focus-visible:ring-2`.
- **rationale** : emoji = 0 dépendance, 0 bundle, cringe rétro assumé (Comic Sans + glitter), suffisant pour un cadeau. SVG lucide aurait été plus pixel-perfect mais ajoute du code pour un détail.
- **alternatives** : SVG lucide-eye/eye-off, ou `lucide-react` → rejeté (poids, pas nécessaire).
- **tradeoff** : rendu emoji variable selon OS, mais `aria-hidden` + `aria-label` garantit l'accessibilité.

### DP2 — Accessibilité

- **choice** : `aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}` + `aria-pressed={show}` + `aria-hidden="true"` sur emoji, `type="button"` (pas submit), pas de `tabIndex=-1` (on a retiré pour permettre Tab), `autoComplete` conservé (`current-password` / `new-password`).
- **rationale** : screen reader annonce l'action, pas l'emoji ; `type=button` évite le submit accidentel ; `autoComplete` inchangé → pas de régression.
- **alternatives** : `aria-controls="password"` → nice-to-have mais non bloquant (ajoutable).
- **tradeoff** : aucun.

### DP3 — Touch target 40 vs 44

- **choice** : `h-10 w-10` (40px) + `pr-12` (48px) → 8px de clearance entre texte et bouton, `input.right - btn.right =4px`, pas de chevauchement même avec `a×50`.
- **rationale** : 40px passe la spec du projet (40 ou 44) et garde de la marge ; 44px (`h-11 w-11` + `pr-14`) aurait laissé seulement 4px de clearance, limite.
- **alternatives** : `h-11 w-11` → 44px strict HIG.
- **tradeoff** : 4px de moins que HIG, mais vérifié Playwright `h-10 w-10` centred, pas de débordement, focus ring visible.

### DP4 — Pas de persistance / log

- **choice** : state local `useState(false)` par page, pas de `localStorage`, pas de `console.log`, pas de `dangerouslySetInnerHTML`.
- **rationale** : le mot de passe reste transient (`useState` → `supabase.auth` / `fetch /api/auth/signup`), visible seulement si l'utilisateur le demande (trade-off shoulder-surfing consenti).
- **tradeoff** : aucun.

## Implementation approach

- **Fichiers clés :**
  - `app/(gate)/login/page.tsx` : ajout `showPassword` state, wrapper `relative` autour de l'input, `type={show ? "text" : "password"}`, `pr-12`, bouton `absolute right-1 top-1/2 -translate-y-1/2 h-10 w-10` avec `aria-label`/`aria-pressed` et emoji.
  - `app/(gate)/inscription/page.tsx` : même pattern, `className={`${inputClass} pr-12`}`, même bouton, `autoComplete new-password`.
- **Flux :** clic œil → `setShowPassword(v=>!v)` → `aria-label` + `aria-pressed` basculent, `input.type` bascule, `value` inchangé, pas de re-render du form, pas de perte de focus (focus reste sur input si on ne met pas `tabIndex=-1`).
- **Style :** `border-2 border-white/40 bg-black/40 rounded-lg` inchangé, bouton `rounded-md text-white/70 hover:bg-white/10 hover:text-white focus-visible:ring-2`.

## Pitfalls & Environment

- **Bouton `type="button"` obligatoire** : sans, le clic soumet le formulaire (bug reproduit dans la branche cassée `feat/password-validation` où le bouton n'avait pas de type et était mal positionné `top-8`).
- **Padding** : `pr-12` indispensable, sinon le texte long passe sous l'œil (vérifié `paddingVsButton true`, `scrollWidth 370 vs client 309` mobile).
- **Tab order** : `tabIndex=-1` retiré pour permettre Tab (3 Tabs pour atteindre le bouton) et `focus-visible:ring` visible.
- **Prettier cascade** : `npx prettier --write .` retouche 21 fichiers ; accepté.

## Lessons for future agents

- Pour un toggle password, toujours `type="button"`, `aria-label` dynamique + `aria-pressed`, `aria-hidden` sur l'icône, `pr-*` ≥ bouton + 8px, `autoComplete` inchangé, pas de `localStorage`.
- 40px est le minimum du projet, 44px est l'idéal HIG — documenter le choix dans le code.
- Tester sur 375px avec `a×50` pour vérifier le non-chevauchement.

## Linked reasoning / similar tasks

- task-memory/2026-09-03-editor-scrollable.md — scrollable middle, toolbar block, busyMap
- task-memory/2026-09-02-carousel-multi-upload.md — batch, CarouselNode
