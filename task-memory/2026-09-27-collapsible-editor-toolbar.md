---
task_id: collapsible-editor-toolbar
date: 2026-09-27
type: feat
area: editor/layout
tags: [editor, toolbar, mobile, collapsible, responsive, retro, css-cascade, a11y]
status: implemented
branch: feat/collapsible-editor-toolbar
related_files:
  [
    components/editor/RetroEditor.tsx,
    components/editor/useCollapsibleToolbar.ts,
    components/editor/useCollapsibleToolbar.test.tsx,
    .gitignore,
    app/globals.css,
  ]
decisions:
  [
    handle-toggle-pattern,
    auto-collapse-on-focus-guard,
    hook-extraction,
    unlayered-css-cascade-fix,
    calc-cap-sticky-chrome,
    767.98-boundary-alignment,
    gitignore-invitation-file,
  ]
---

# Feature : barre de styles repliable de l'éditeur (mobile)

## Summary

La grande toolbar de mise en page de l'éditeur (polices, tailles, couleurs, néon, arc-en-ciel, défilant, clignotant, flou, alignement, HTML…) est désormais **repliable sur mobile** : repliée par défaut à l'ouverture, poignée « 🎨 Styles ▼/▲ » pleine largeur pour la ré-afficher, et **auto-repli automatique quand l'utilisateur reprend la frappe** (focus éditeur) — avec une fenêtre de grâce de 800 ms pour ne pas refermer la barre juste après avoir cliqué un bouton de style. Desktop strictement inchangé (poignée cachée, barre toujours ouverte). Gain mesuré : +153 à +208 px de zone d'écriture visible sur mobile.

## Context / Problem

- Demande du propriétaire : « in the mobile version i want this menu to be collapsable, i want a possibility (maybe automatic) for collapse the editor menu to save screen space and the ability to re display it ».
- La toolbar wrapped faisait ~531 px de haut sur 375 px (mesuré dans fix-editor-scrollable) ; sticky, elle écrasait la zone d'écriture, surtout avec le clavier virtuel (~40 % de l'écran). Mobile-first = contrainte dure (PROJECT_PLAN §2/§8).
- La logique de repli est dans un hook dédié testé (17 tests unitaires) ; RetroEditor ne fait que câbler l'UI.

## Decision Points

### DP1 — Poignée toggle + état local (vs alternatives)

- **choice** : bouton poignée « 🎨 Styles ▼/▲ » (`retro-btn tool-btn styles-handle md:hidden`) toujours rendu dans le bloc sticky ; la grande région `#retro-style-toolbar` est rendue conditionnellement (`{toolbarOpen && …}`).
- **rationale** : ré-affichage toujours possible (exigence explicite), la poignée reste accessible au scroll (sticky), esthétique rétro (pill rose gradient, instantané, 0 animation — authentique 2000s), a11y (`aria-expanded`/`aria-controls`/`role="region"`), cible tactile ≥ 44 px pleine largeur.
- **alternatives** : menu « Plus ▾ » regroupant les outils secondaires (plus complexe, moins découvrable) ; toolbar horizontale scrollable nowrap (déjà testée dans fix-editor-scrollable, restait énorme) ; drag-to-expand (anti-rétro).
- **tradeoff** : un tap de plus pour accéder aux styles sur mobile — acceptable, c'est le prix de l'espace d'écriture.

### DP2 — Auto-repli au focus éditeur + fenêtre de grâce 800 ms

- **choice** : abonnement `editor.on("focus")` (TipTap v3) → repli si mobile ET `Date.now() - lastTouch > 800 ms`. `touchToolbar()` (timestamp ref) appelé sur `onPointerDown` du bloc sticky ET explicitement dans les handlers à `window.prompt` (handleLink, handleAddVideo) et les `onChange` des `<select>`/`<input color>` natifs.
- **rationale** : « maybe automatic » → repli quand l'utilisateur tape du texte (le clavier s'ouvre, il faut de la place). Les boutons de style appellent `chain().focus()` : sans garde, le premier clic sur Gras refermerait la barle immédiatement. Les pickers natifs peuvent rester ouverts plusieurs secondes → le pointerdown seul serait périmé, d'où les `touchToolbar()` explicites.
- **alternatives** : repli au scroll du conteneur (signal bruité) ; `visualViewport.resize` (détection clavier réelle mais capricieuse) ; pas d'auto-repli du tout.
- **tradeoff** : deux mécanismes (auto + manuel) à documenter ; garde testée aux bornes exactes (800 ms inclus, 801 ms replie).

### DP3 — Extraction en hook `useCollapsibleToolbar`

- **choice** : `components/editor/useCollapsibleToolbar.ts` — `useCollapsibleToolbar(editor: Editor | null)` retourne `{ toolbarOpen, toggleToolbar, touchToolbar, isMobile }` ; `TOOLBAR_GUARD_MS = 800` exporté ; matchMedia `(max-width: 767.98px)` avec écoute du `change` ; desktop force `toolbarOpen = true` (jamais coincée cachée) ; refs lus dans le handler de focus → pas de closure périmée malgré `shouldRerenderOnTransaction`.
- **rationale** : testable isolément (renderHook + matchMedia mock + fake editor `{on, off}` + fake timers) sans monter TipTap/Supabase ; RetroEditor reste un simple câblage. Appel AVANT l'early return `if (!editor)` (règles des hooks), le hook accepte `editor = null`.
- **tradeoff** : un fichier de plus ; 17 tests dedications.

### DP4 — Piège cascade CSS : le `<style>` non layerisé bat `md:hidden` (BLOCKING trouvé par layout-tester)

- **choice** : scoper la règle `.styles-handle` dans le bloc `<style>` du composant : `@media (max-width: 767.98px) { display:flex; … }` + `@media (min-width: 768px) { display: none; }`. `md:hidden` conservé en ceinture-bretelles.
- **rationale** : Tailwind v4 met `md:hidden` dans `@layer utilities` ; le bloc `<style>` inline du composant est NON layerisé → cascade L5 : un style normal non layerisé gagne contre un style layerisé quelle que soit la spécificité. Résultat round 1 : la poignée s'affichait ET restait cliquable sur desktop (706×50 px), `toggleToolbar` pouvait masquer la barre desktop sans récupération auto.
- **alternatives** : `@layer components` autour du CSS du composant (plus large refactor) ; `!important` sur `md:hidden` (visqueux).
- **tradeoff** : duplication de la media query ; OBLIGATOIRE de garder les DEUX media queries dans le bloc non layerisé.
- **LEÇON CLÉ pour tout futur CSS de composant dans ce repo** : toute règle `display` non layerisée écrase une utilité Tailwind layerisée (`md:`, `max-md:`, `hidden`, `flex`…).

### DP5 — Cap `calc(42vh - 80px)` : soustraire le chrome sticky

- **choice** : `max-md:max-h-[calc(42vh-80px)] max-md:overflow-y-auto` sur la région dépliée. 80 px ≈ poignée (51) + `mt-2` (8) + padding bloc (16) + bordure (4).
- **rationale** : un simple `max-h-[42vh]` sur la région ne bornait que la région — le bloc sticky TOTAL (région + chrome) restait ≥ la hauteur du scrollport middle sur téléphones courts (360×740 : sticky 390 vs middle 390 → bande éditeur −11 px, focus inatteignable, auto-repli jamais déclenché). Soustraire le chrome garantit sticky ≤ 42vh → bande tappable à TOUTES les hauteurs testées : 45 px @667, 80 px @740, 115 px @812 → focus → auto-repli vérifié bout-en-bout aux 3 tailles.
- **alternatives** : 38vh (bande plus fine mais chrome non déduit) ; retirer le sticky quand déplié (la poignée devient inaccesssible au scroll) ; accepter la limite (round 2).
- **tradeoff** : la toolbar dépliée scrolle en interne sur mobile (scroll imbriqué) — prix raisonnable ; la bande éditrice reste étroite sur 667 px mais un swipe suffit.

### DP6 — Alignement des bornes sur 767.98px (Tailwind v4)

- **choice** : media queries du composant ET `MOBILE_QUERY` du hook alignés sur `(max-width: 767.98px)` / `(min-width: 768px)`.
- **rationale** : Tailwind v4 utilise 767.98px comme borne `md`. Avec des entiers (767/768), une largeur fractionnaire (767.5 px, zoom navigateur) tombait dans un angle mort : NI les règles mobiles NI desktop ne s'appliquaient → poignée « pill » inline-block fantôme pendant que le hook la traitait en desktop.
- **tradeoff** : fenêtre résiduelle théorique de 0.02 px (767.98→768) — inatteignable en pratique ; vérifié empiriquement à 767, 767.5 (iframe), 768.

### DP7 — Security I-1 : gitignore du fichier d'invitation physique

- **choice** : `INVITATION_CAROLINE_30.md` ajouté à `.gitignore` (commentaire explicite §10 stealth) suite à la finding **important** de l'agent security : le fichier non tracké au racine contient le code d'invitation LIVE + le prénom de la destinataire ; le `git add -A` du pipeline l'aurait gravé dans l'historique git.
- **rationale** : le pipeline step 9 impose `git add -A` — la protection doit être systémique (gitignore), pas une vigilance ponctuelle par tâche.
- **alternatives** : déplacer le fichier hors du repo (décision humain) ; staging sélectif à chaque tâche (fragile).
- **tradeoff** : le fichier reste sur disque (voulu : c'est l'invitation physique du jour J).

## Implementation approach

- **Fichiers clés** :
  - `components/editor/useCollapsibleToolbar.ts` (nouveau, 97 lignes) : matchMedia + focus subscription + garde 800 ms + toggle.
  - `components/editor/RetroEditor.tsx` : hook avant early return ; bloc sticky restructuré (poignée `md:hidden` + région conditionnelle `id="retro-style-toolbar" role="region"` avec cap `calc(42vh-80px)`) ; `touchToolbar()` sur pointerdown du bloc + dans handleLink/handleAddVideo/onChange selects+color ; CSS `.styles-handle` scopé media (DP4) ; `onMouseDown preventDefault` sur la poignée pour préserver la sélection.
  - `components/editor/useCollapsibleToolbar.test.tsx` (nouveau) : 17 tests — états initiaux desktop/mobile, toggle, auto-repli, garde aux bornes exactes (800 inclus / 801 exclus), desktop jamais de repli, flips de breakpoint, cycle null→editor, cleanup strict-mode (refs exactes off/removeEventListener).
  - `.gitignore` : + INVITATION_CAROLINE_30.md.
- **Flux** : ouverture mobile → repliée par défaut → tap poignée → déplie (cap interne) → tap bouton style → garde → l'utilisateur tape (focus) → auto-repli → poignée toujours là pour ré-afficher. Desktop : aucun changement (poignée `display:none`, barre dépliée).

## Pitfalls & Environment

- **Cascade CSS L5 (le gros piège)** : Tailwind v4 layerise ses utilités (`@layer utilities`) ; les blocs `<style>` de composants React ne le sont pas → gagnent TOUJOURS contre `md:hidden` & co. Vérifier TOUTE classe utilitaire Tailwind censée contredire un CSS de composant. Détecté par le layout-tester round 1 (handle visible desktop 706×50) — invisible pour tsc/lint/tests.
- **Cap de hauteur ≠ cap du sticky** : le sticky total = région + poignée + paddings ; un `max-h` sur la région seule laisse le bloc déborder le scrollport sur téléphones courts. Toujours soustraire le chrome (ici 80 px).
- **Media queries entières vs Tailwind 767.98px** : utiliser 767.98px partout (CSS composant + matchMedia JS + tests) sinon angle mort fractionnaire.
- **window.prompt + focus** : les handlers à prompt doivent stamp la garde EXPLICITEMENT (le pointerdown est périmé après la fermeture du prompt). Idem les pickers natifs (select, input color) ouverts plusieurs secondes.
- **Prettier cascade** : `npx prettier --write .` reformatte ~15 fichiers docs/scripts avec du drift antérieur (quotes YAML, whitespace) — accepté par précédent (task-memory 2026-09-03) ; isolé dans un commit `style:` dédié pour l'hygiène de review.
- **Reconstruction harness** : pas de credentials de test → layout testé via harness Playwright `page.setContent` (pattern établi fix-editor-scrollable). Le hook logique est couvert par les 17 tests unitaires ; le harness valide la géométrie/CSS réels.
- **RetroEditor re-renders fréquemment** (`shouldRerenderOnTransaction`) : lire des refs dans les handlers d'événements du hook, pas des states capturés.

## Lessons for future agents

- Toute nouvelle UI mobile dense → envisager repliable avec : défaut replié mobile, poignée sticky toujours visible, auto-repli au focus, garde anti-repli-juste-après-clic.
- Pour tester un composant lourd (TipTap+Supabase) : extraire la logique de state en hook → renderHook + mocks fins (matchMedia controllable, fake `{on, off}`, fake timers aux bornes exactes).
- Le layout-tester peut trouver des bugs que tsc/lint/tests unitaires ne voient pas (cascade CSS, géométrie) — les 3 rounds ici ont chacun attrapé un problème réel : cascade L5 (blocking) → cap sans chrome (important) → bornes fractionnaires (nit).
- Toujours vérifier ce que `git add -A` va réellement staging (le pipeline l'impose) — le fichier d'invitation est maintenant gitignoré, mais rester vigilant à tout nouveau fichier local sensible.

## Linked reasoning / similar tasks

- task-memory/2026-09-03-editor-scrollable.md — structure sticky header/middle/footer de la modale, toolbar wrap 531px@375, leçon flex-nowrap.
- task-memory/2026-09-03-retro-mark-toggle.md — pattern `onMouseDown preventDefault` pour préserver la sélection, réutilisé sur la poignée.
- task-memory/2026-09-26-security-collapsible-editor-toolbar.md — revue sécurité de ce changement (PASS, I-1 fixed).
- task-memory/screenshot/feat/collapsible-editor-toolbar/REPORT.md — 3 rounds de mesures (rounds 1-2 préservés dans metrics-round*.json).
