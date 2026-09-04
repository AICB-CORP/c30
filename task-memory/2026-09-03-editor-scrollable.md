---
task_id: editor-scrollable
date: 2026-09-03
type: fix
area: editor/layout
tags: [editor, scroll, layout, responsive, retro, accessibility]
status: implemented
branch: fix/editor-scrollable
related_files:
  [
    components/editor/RetroEditor.tsx,
    app/globals.css,
    components/editor/CarouselNode.ts,
    lib/sanitize.ts,
    .opencode/agent/project-manager.md,
  ]
decisions:
  [scrollable-middle, toolbar-nowrap, sticky-footer, responsive-carousel-fix, mandatory-gates]
---

# Fix : éditeur scrollable — publier toujours accessible

## Summary

L'éditeur de post devenait si grand avec plusieurs images qu'il était impossible d'atteindre le bouton Publier (toolbar wraps 531px sur mobile + editor min 180px + publish 46px > 90vh, outer overflow-hidden coupait le bouton). Le fix rend la modale `max-h-[90vh] flex-col overflow-hidden`, le header et le footer (Publier) `flex-shrink-0`, la zone du milieu `flex-1 overflow-y-auto`, la toolbar `flex-nowrap overflow-x-auto` (une seule ligne scrollable horizontalement) et l'éditeur `min-h-[180px] flex-1 overflow-y-auto`. Le bouton reste visible sur 1280/375/360, le carrousel reste responsive, et le pipeline est durci : `project-manager.md` rappelle désormais que security (chaque code change) et layout-tester (chaque UI) sont mandatory.

## Context / Problem

- Déclencheur : ticket « text editor to be scrollable, when adding many images the post editor is too big making impossible to publish » + remarque « UI tester and security tester not called ».
- Contraintes PROJECT_PLAN §2/§8 mobile-first (Caroline sur téléphone), §4 zero-budget, §7.1 éditeur riche, §10 stealth.
- La modale précédente : `fixed inset-0 flex items-start overflow-y-auto py-6` + `retro-box w-[95vw] max-w-3xl` sans max-h, `editor-area flex min-h180` avec `max-h-[45vh]` interne. La toolbar `flex-wrap` contenait ~20 boutons (B,I,U,S,H1,H2, List, color, swatches, font, size, align, link, music, video, neon, rainbow…) → 3-4 lignes desktop (275px), 11 lignes mobile 375px (531px) + privacy 70 + media 98 + editor 180 + publish 46 > 90vh → `publish.insideBox false` sur tous les viewports (42px clipped desktop, 301px mobile).
- Le layout-tester précédent avait déjà signalé le débordement, mais le fix initial (outer overflow-hidden + retro-box max-h 90vh + editor max-h 45vh) n'a pas réduit la hauteur toolbar, donc le publish restait hors boîte.

## Decision Points

### DP1 — Toolbar flex-nowrap overflow-x-auto

- **choice** : `flex flex-nowrap items-center gap-1.5 overflow-x-auto pb-1` au lieu de `flex-wrap`. La toolbar devient une seule ligne scrollable horizontalement avec scrollbar pink fine.
- **rationale** : passe de 275/531px à 122/142px (-409px à 375), libère 90vh. Le scroll horizontal est naturel pour une toolbar dense et garde les touch targets à 46px.
- **alternatives** : cacher les marks secondaires derrière « Plus » → plus complexe, hors scope.
- **tradeoff** : scrollbar horizontale visible, mais rétro et acceptable.

### DP2 — Scrollable middle + sticky footer

- **choice** : `retro-box max-h-[90vh] flex-col overflow-hidden` + header `flex-shrink-0` + middle `flex min-h-0 flex-1 flex-col overflow-y-auto pr-1 gap-2` (contient toolbar, media, gif, voice, music, editor) + footer `flex-shrink-0 pt-3 border-t`.
- **rationale** : header et Publier restent fixes, seul le milieu défile. Même avec 10 images/carrousel, le publish est `insideBox && inViewport` sur 1280/375/360 (mesuré 672→718 desktop, 709→755 mobile).
- **alternatives** : rendre toute la modale `overflow-y-auto` (ancien comportement) → le header disparaît au scroll, moins ergonomique.
- **tradeoff** : double scroll potentiel (middle + editor inner) mais le inner `overflow-y-auto` est conservé pour le cas où l'éditeur seul déborde (carrousel).

### DP3 — Editor-area flex-1 sans max-h interne

- **choice** : `editor-area mb-2 flex min-h-[180px] flex-col overflow-hidden` + inner `min-h-[180px] flex-1 overflow-y-auto p-2` sans `max-h-[45vh]`. Le parent scrollable gère la hauteur globale.
- **rationale** : évite `max-h 45vh + middle scroll` = double scroll inutile. Le `min-h 180` garantit une zone éditable visible même vide.
- **alternatives** : garder double max-h → complexité.
- **tradeoff** : sur très grand écran, l'éditeur peut grandir au-delà de 50vh mais reste contenu par `max-h 90vh` du retro-box.

### DP4 — Responsive carrousel déjà fixé mais conservé

- **choice** : garder `width:min(280px,70vw)` / `clamp` et `max-width:100%` pour le carrousel (fix B1 précédent).
- **rationale** : déjà validé par reviewer, évite overflow horizontal du carrousel.
- **tradeoff** : aucun.

### DP5 — Durcissement pipeline project-manager.md

- **choice** : ajout d'un encadré **⚠️ MANDATORY DELEGATIONS — NEVER SKIP** sous §4 IMPLEMENT rappelant que security (step 6b) est pour **chaque code change** et layout-tester (step 6c) pour **chaque UI**.
- **rationale** : répond au feedback « no ui tester was called neither security tester » ; le fichier déjà contenait les sections mais pas assez visible en début de pipeline.
- **alternatives** : laisser tel quel → risque de skip futur.
- **tradeoff** : doc-only, pas de runtime.

### DP6 — Garde musicEmbed isSafeIframe

- **choice** : `isSafeIframe` autour du preview `musicEmbed` dans RetroEditor (déjà corrigé suite à security review).
- **rationale** : évite self-XSS via DevTools.
- **tradeoff** : un import de plus.

## Implementation approach

- **Fichiers clés :**
  - `components/editor/RetroEditor.tsx` : outer `overflow-hidden` + `items-center`, retro-box `max-h-[90vh] flex-col overflow-hidden`, header `flex-shrink-0`, middle `flex-1 overflow-y-auto min-h-0`, toolbar `flex-nowrap overflow-x-auto`, editor-area sans max-h, footer `flex-shrink-0` avec Publier disabled `saving||mediaBusy`, voice `mediaBusy` guard, `isSafeIframe` guard.
  - `app/globals.css` : inchangé pour carrousel (déjà responsive), pas de nouveau CSS pour scroll (utilise Tailwind).
  - `components/editor/CarouselNode.ts` / `MediaUpload.tsx` : inchangés dans ce fix (hérités).
  - `.opencode/agent/project-manager.md` : ajout encadré mandatory delegations.
- **Flux** : header fixe, middle défile (toolbar scroll horizontal + editor scroll vertical), footer fixe. Même avec 10 images, `publish` reste à `709→755` mobile 375 (mesuré).

## Pitfalls & Environment

- **Toolbar wraps** : Tailwind `flex-wrap` avec labels longs (`Arc-en-ciel` 118px) wrap agressivement sur 375px (11 lignes). Passer à `nowrap` + `overflow-x-auto` divise la hauteur par 4. Mesure via `measure-fixed.mjs` : 275→122 desktop, 531→142 mobile.
- **Double scroll** : avoir à la fois `middle overflow-y-auto` et `editor inner max-h 45vh` crée deux scrollbars ; simplifié en ne gardant que le middle comme scroll principal et l'inner comme `flex-1`.
- **Prettier cascade** : `npx prettier --write .` retouche 21 fichiers dont des docs ; accepté pour pipeline.
- **Security/Layout gates** : la review security a trouvé `musicEmbed` sans guard (Important) → fixé ; layout a trouvé publish clipped (Blocking) → fixé avec toolbar nowrap + flex-col middle.

## Lessons for future agents

- Pour toute modale `fixed inset-0` avec contenu dense, **toujours** `max-h-[90vh] flex-col overflow-hidden` + header/footer `flex-shrink-0` + middle `flex-1 overflow-y-auto min-h-0` ; ne jamais `overflow-y-auto` sur l'outer seul.
- Une toolbar avec >15 boutons doit être `flex-nowrap overflow-x-auto`, pas `flex-wrap`, sinon elle explose en hauteur sur mobile et pousse le CTA hors viewport.
- Toujours appeler **security** (chaque code change) et **layout-tester** (chaque UI) — le pipeline les place entre tests et review ; le skip n'est autorisé que pour doc-only.
- Mesurer avec Playwright `getBoundingClientRect` + `insideBox && inViewport` sur 1280/375/360 pour valider avant de merger.

## Linked reasoning / similar tasks

- task-memory/2026-09-02-carousel-multi-upload.md — batch + carrousel, busy guard, sanitize data-carousel
- task-memory/2026-09-02-video-audio-upload-fix.md — allowlist 23, normalize codecs, MAX 50
- task-memory/2026-09-01-image-cropper-compression.md — cropper queue, 50 Mo guard
