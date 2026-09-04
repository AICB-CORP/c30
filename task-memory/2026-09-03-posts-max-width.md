---
task_id: posts-max-width
date: 2026-09-03
type: fix
area: layout/posts
tags: [layout, posts, max-width, grid, carousel, responsive]
status: implemented
branch: fix/posts-max-width-872
related_files: [app/(site)/page.tsx, components/post/PostCard.tsx, app/(site)/layout.tsx]
decisions: [max-width-872, minmax-grid, min-w-0]
---

# Fix : posts max-width 872px alignés sur le header

## Summary

Les posts de la page d'accueil prenaient trop de place horizontalement et débordaient du header (872px). Le header est dans `max-w-4xl` (896) avec `px-3` → largeur utile 872, mais la grid `1fr 300px` + les cartes sans `max-width` + le carrousel `≈888px` faisaient déborder (`docScrollWidth > vw`, `dsw 1400>1280`). Le fix contraint la grid à `mx-auto w-full max-w-[872px]` avec `lg:grid-cols-[minmax(0,1fr)_300px]` et la colonne posts à `min-w-0`, et chaque `PostCard` à `mx-auto w-full max-w-[872px]`.

## Context / Problem

- Déclencheur : ticket « the posts on the main page to have a max-width according to the header (872px) actually the posts take to much space horitontally ».
- Contraintes PROJECT_PLAN §8 rétro (ne pas casser `retro-box` ridge, `neon`, `marquee`), §2 mobile-first (375px sans scroll horizontal).
- La grid précédente `1fr 300px` utilise `minmax(auto,1fr)` par défaut, donc le carrousel (`flex` 3×280) impose `min-content ≈888` → la colonne 1fr s'étire à 872 et pousse la sidebar à 300 → `dsw 1400>1280`, header 872 vs grid 872+300 → désaligné. Sur mobile, `dsw 868>375`.

## Decision Points

### DP1 — Grid `max-w-[872px]` + `minmax(0,1fr)` + `min-w-0`

- **choice** : `mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]` + `<div class="min-w-0">` pour la colonne posts.
- **rationale** : `minmax(0,1fr)` force la colonne à rétrécir à 0 au lieu de `auto` (min-content du carrousel), `min-w-0` évite le `min-width:auto` par défaut du grid item qui empêche le rétrécissement. Avec `max-w-[872px]` la grid + header sont alignés (delta 0) à 1280/375/768/360, `docScrollWidth==vw` même avec carrousel.
- **alternatives** : `max-w-4xl` sans `minmax` → garde le débordement carrousel ; `overflow-hidden` sur grid → cache le carrousel au lieu de le faire scroller.
- **tradeoff** : une classe de plus, mais le carrousel garde son `overflow-x-auto` interne (scroll horizontal du carrousel, pas de la page).

### DP2 — PostCard `max-w-[872px]`

- **choice** : `retro-box mx-auto mb-5 w-full max-w-[872px]` (était `retro-box mb-5`).
- **rationale** : quand `PostCard` est réutilisée hors grid (`/posts/[id]`, `/profil/[pseudo]`, `/day`), elle doit aussi être centrée et limitée à 872, sinon elle prend tout le viewport. Dans la grid, le `max-w` est redondant mais harmless et durcit contre `style="width:9999px"` (allowed `width` dans `HTML_STYLES` mais clampé).
- **tradeoff** : redondance grid + card, mais cohérent pour les pages standalone.

## Implementation approach

- **Fichiers clés :**
  - `app/(site)/page.tsx` : `mx-auto grid w-full max-w-[872px] gap-6 lg:grid-cols-[minmax(0,1fr)_300px]` + `<div class="min-w-0">` autour de `postList.map`.
  - `components/post/PostCard.tsx` : `retro-box mx-auto mb-5 w-full max-w-[872px]`.
  - `app/(site)/layout.tsx` : inchangé (`max-w-4xl` + `px-3` → 872 utile, déjà aligné).
- **Flux** : header 872 == grid 872 == PostCard 872, carousel `≈888` est contenu dans `1fr` `minmax(0,1fr)` + `min-w-0` → `dsw 1280` (au lieu de 1400), mobile 375 `dsw 375` (au lieu de 868).

## Pitfalls & Environment

- **Grid `1fr` vs `minmax(0,1fr)`** : le défaut `1fr` = `minmax(auto,1fr)` où `auto` = min-content du plus grand enfant (carrousel 888). Sans `minmax(0,1fr)` + `min-w-0`, le carrousel force la colonne à 872 et la sidebar à 300 → 1172 > 896 → overflow. Vu dans le layout-tester `OLD+carousel 932px col, dsw 1460`.
- **PostCard redondant** : `mx-auto` dans la grid est inutile mais nécessaire pour les pages standalone.
- **Prettier cascade** : `npx prettier --write .` retouche 21 fichiers.

## Lessons for future agents

- Pour toute grid `1fr` contenant du contenu intrinsèquement large (carrousel flex, `pre`, `table`, `marquee`), toujours `minmax(0,1fr)` + `min-w-0` sur l'enfant, sinon `min-content` fait déborder la page.
- Aligner les `max-w` sur la même valeur (872) pour header et contenu principal, en tenant compte du `px-3` du layout (`max-w-4xl 896 → 872 utile`).

## Linked reasoning / similar tasks

- task-memory/2026-09-03-editor-scrollable.md — scrollable middle, toolbar block
- task-memory/2026-09-02-carousel-multi-upload.md — carrousel flex, batch
- task-memory/2026-09-03-carousel-fix.md — carousel content image* + inline:true
