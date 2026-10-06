---
task_id: favicon-c-heart
date: 2026-10-01
type: feat
area: branding/favicon
tags: [favicon, icon, svg, ico, apple-icon, sharp, vercel, theme-color]
status: implemented
branch: feat/favicon-c-heart
related_files:
  - app/icon.svg
  - app/favicon.ico
  - app/apple-icon.png
  - app/layout.tsx
  - scripts/generate-favicon.mjs
  - scripts/lib/favicon-ico.mjs
  - scripts/favicon-ico.test.ts
  - package.json
decisions:
  [
    favicon-c-heart/svg-plus-ico,
    favicon-c-heart/hand-built-ico,
    favicon-c-heart/sharp-devdep,
    favicon-c-heart/theme-color-viewport,
  ]
---

# Favicon « C » avec coeur + déploiement Vercel

## Summary

Ajout d'une favicon « C avec coeur » (carré arrondi rose Skyrock #FF69B4, C blanc en arc épais, coeur
framboise foncé niché dans l'ouverture du C) sous trois formats complémentaires : `app/icon.svg`
(favicon vectorielle, Chrome/Firefox), `app/favicon.ico` régénérée (16/32/48 px, PNG-embedded,
Safari/anciens navigateurs) et `app/apple-icon.png` (180 px, écran d'accueil iOS). Plus
`themeColor: "#FF69B4"` dans l'export `viewport` de `app/layout.tsx` (Chrome assorti à la favicon).
Un script de régénération reproductible (`scripts/generate-favicon.mjs` + `npm run favicon`) et 15
tests unitaires du builder ICO accompagnent le tout. Déploiement Vercel : preview auto au push + deploy
production depuis la branche.

## Context / Problem

Demande directe (non-issue) : « add a favicon of a C letter with a heart and deploy it to vercel ».
L'ancienne `app/favicon.ico` était l'icône par défaut de Next.js (le triangle N) — hors sujet pour un
cadeau personnalisé. Contraintes : PROJECT_PLAN.md §8 (esthétique rétro — rose Skyrock classique),
§10 (stealth — aucun nom dans les assets, tout auto-hébergé), budget zéro. Caroline lira sur iPhone
Safari (§2) → il faut couvrir l'écran d'accueil iOS (apple-icon) ET les navigateurs sans support SVG.

## Decision Points

### DP1 — SVG + ICO + apple-icon (trois assets) plutôt qu'ICO seul

- **choice** : `app/icon.svg` + `app/favicon.ico` régénérée + `app/apple-icon.png`.
- **rationale** : Next.js 16 détecte les trois conventions de fichiers et injecte les `<link>` (icon.svg
  → `type="image/svg+xml" sizes="any"`, favicon.ico → `type="image/x-icon"`, apple-icon →
  `rel="apple-touch-icon"` 180x180). Chrome/Firefox préfèrent le SVG (net à toute taille), Safari et
  les webviews anciennes tombent sur l'ICO, l'écran d'accueil iOS utilise l'apple-icon.
- **alternatives** : ICO seul (perte de la netteté vectorielle sur écrans HiDPI) ; SVG seul (Safari
  desktop < 15 et certains webviews Android ne le rendent pas).
- **tradeoff** : trois fichiers à maintenir — automatisé par le script de régénération (2,2 Ko + 4,5 Ko,
  coût négligeable).

### DP2 — ICO construit à la main (script) plutôt que dépendance `png-to-ico`

- **choice** : builder ICO pur (~40 lignes) dans `scripts/lib/favicon-ico.mjs`, format PNG-embedded
  (Vista+), supporté par tous les navigateurs modernes et Safari.
- **rationale** : évite une nouvelle dépendance ; le format ICO est simple (ICONDIR 6 octets + entrées
  16 octets + payloads PNG) ; le builder est pur → testable unitairement (15 tests : structure header,
  entrées, offsets, payload byte-identique, erreurs).
- **alternatives** : `png-to-ico` (dépendance de plus pour un usage unique) ; garder l'ICO par défaut
  (hors sujet).
- **tradeoff** : le format est maintenu à la main — couvert par les tests et documenté.

### DP3 — sharp en devDependency explicite (0.35.5) plutôt que transitive

- **choice** : `npm i -D sharp@^0.35.3` (résolu en 0.35.5, même range que l'optionalDependency de Next).
- **rationale** : sharp n'était présent que comme optionalDependency de `next` — pas garanti sur un
  clone frais ; le script de régénération doit marcher partout.
- **alternatives** : compter sur la transitive (fragile) ; rendu SVG → PNG sans sharp (satori/resvg,
  complexité supérieure).
- **tradeoff** : paquet natif ~11 Mo en devDeps — n'affecte jamais le bundle déployé (script dev-only,
  jamais importé dans app/).

### DP4 — themeColor dans l'export `viewport` (pas metadata)

- **choice** : `export const viewport: Viewport = { themeColor: "#FF69B4" }` dans `app/layout.tsx`.
- **rationale** : `themeColor` dans `metadata` est **déprécié depuis Next 14** (vérifié dans les docs
  embarquées `node_modules/next/dist/docs/.../generate-metadata.md` L654) — AGENTS.md prévient que
  cette version de Next casse les conventions connues.
- **alternatives** : `metadata.themeColor` (déprécié, warning de build).
- **tradeoff** : un import de plus ; zéro impact stealth (couleur de chrome navigateur, jamais utilisée
  pour l'indexation).

### DP5 — Design géométrique : C « berçant » le coeur

- **choice** : C en arc blanc (centre 32.67,32 ; r=17 ; stroke 9) avec ouverture à droite (±52.6°),
  coeur centré (46, 33.5) entièrement dans l'ouverture angulaire → aucun chevauchement avec le trait.
- **rationale** : à 16 px les détails disparaissent — garder 2 formes grasses à fort contraste ;
  le C qui « tient » le coeur raconte l'intention (le blog est un cadeau).
- **alternatives** : C noir sur rose (moins lisible en petit) ; coeur superposé au trait (boueux à 16 px).
- **tradeoff** : aucun — vérifié par le layout-tester (rendu 256 px + ICO 32 px nets).

## Implementation approach

1. `app/icon.svg` — design (rect rx=14 #FF69B4, arc C blanc, coeur #e2004e), géométrie vérifiée
   (tous les points du coeur dans le wedge d'ouverture du C).
2. `scripts/lib/favicon-ico.mjs` — builder ICO pur (export `buildIco(images)`), validation stricte
   (1–255 images, taille entière 1–256, règle 256→0 pour les octets width/height).
3. `scripts/generate-favicon.mjs` — runner (sharp rend 16/32/48 + 180 px depuis le SVG, construit
   l'ICO, écrit les deux fichiers APRÈS avoir construit les deux buffers — jamais désynchronisés).
   `npm run favicon` pour relancer.
4. `app/favicon.ico` + `app/apple-icon.png` — générés, committés (artefacts source).
5. `app/layout.tsx` — export `viewport` avec themeColor.
6. Next.js injecte automatiquement les `<link>`/`<meta>` — aucun `<head>` manuel.
7. Tests : `scripts/favicon-ico.test.ts` (15 tests, import du .mjs via allowJs + JSDoc types).

## Pitfalls & Environment

- **Vercel MCP scope** : le token en cours est scopé « moiap13s-projects » — passer un `teamId`
  explicite (`team_wjIGEEphSz3vqjIhkYRhyY4L`) échoue en 403 ; utiliser `idOrName` seul (le scope du
  token contient le projet `c30`). Les reads par projet fonctionnent sans teamId.
- **vitest include** = `**/*.{ts,tsx}` → un test `.mjs` ne serait pas ramassé ; le builder pur vit
  dans un .mjs mais le test est en .ts (import résolu via `allowJs: true` + JSDoc types — pas besoin
  de .d.mts).
- **tsconfig include** a `**/*.mts` mais pas `**/*.mjs` → un script .mjs échappe au type-check tsc ;
  c'est voulu (runner Node simple, pas de flag `--experimental-strip-types`, Node local v22.17).
- **prettier --write .** re-formate des docs task-memory préexistants qui avaient dérivé sur main
  (padding de tableaux markdown) — même motif que la session précédente ; drift isolé dans un commit
  `style:` séparé pour garder le diff de la feature propre.
- **`file` n'affiche que 2 des 3 icônes** du .ico généré (16/32) mais confirme « 3 icons » — le 48
  est bien dedans (vérifié par parsing binaire côté security agent).
- **graphify extract Ollama** : le build `--backend ollama` remplit le cache sémantique mais ne
  réécrit PAS `graphify-out/graph.json` (dernière écriture au 27/09, « prior failed extraction,
  #2543 ») — le fallback `--code-only --no-cluster --out .` fonctionne (560 nœuds écrits, graphe
  étendu avec le code favicon ; les docs task-memory restent hors graphe tant que le bug Ollama
  n'est pas corrigé).

## Lessons for future agents

1. **Vérifier les conventions Next dans les docs embarquées** (`node_modules/next/dist/docs/`) avant
   de toucher metadata/viewport — `themeColor` a migré de metadata vers viewport en Next 14.
2. **Les conventions de fichiers metadata** (`favicon.ico`, `icon.svg`, `apple-icon.png` dans app/)
   injectent les `<link>` automatiquement — ne jamais écrire de `<head>` manuel.
3. **Un asset généré committé doit avoir son script de régénération** + un test sur la logique pure
   (extraire le builder du script à effets de bord pour le rendre testable).
4. **Vercel MCP : project ops sans teamId explicite** quand le token est scopé projet.
5. **Isoler le drift prettier des docs task-memory** dans un commit `style:` séparé (pattern établi).

## Linked reasoning / similar tasks

- `task-memory/2026-09-21-deploy-vercel-domain.md` — déploiement Vercel + domaine caroline-30.fun,
  workflow GitHub Actions, SSO bypass sur domaines custom.
- `task-memory/2026-10-01-security-favicon-c-heart.md` — rapport sécurité de cette tâche (verdict
  merge-ready, 0 blocking, 4 nits).
- `task-memory/2026-09-26-security-collapsible-editor-toolbar.md` — posture sécurité établie
  (whitelist sanitize, isSafeIframe, oEmbed allowlist).
