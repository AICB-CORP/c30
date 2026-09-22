---
task_id: retro-mark-toggle
date: 2026-09-03
type: fix
area: editor/retro
tags: [tiptap, toggle, mark, rainbow, marquee, blink, blur, placeholder, isActive, getMarkRange]
status: implemented
branch: fix/retro-mark-toggle-placeholder
related_files: [components/editor/RetroEditor.tsx, components/editor/retroMarks.ts]
decisions: [early-return-isActive, getMarkRange-collapsed, placeholder-only-when-inactive]
---

# Fix : toggle effets rétro n'ajoute plus « texte arc-en-ciel » au second clic

## Summary

Cliquer une fois sur un effet (arc-en-ciel, défilant, clignotant, flou) insérait le placeholder (« texte arc-en-ciel », etc.) et activait le style, mais recliquer pour désactiver réinsérait le même texte au lieu de juste désactiver. Cause : `toggleRetroMark` testait seulement `selection.empty` pour décider d'insérer le placeholder, sans vérifier si le mark était déjà actif. Le fix ajoute une garde `if (editor.isActive(mark))` en tête : si le mark est actif au curseur, on le désactive directement (et, si le curseur est collapsé à l'intérieur du mot marqué, on sélectionne d'abord l'étendue marquée via `getMarkRange` pour que le style disparaisse visuellement, pas seulement le stored mark).

## Context / Problem

- Déclencheur : ticket « when selecting an effect, such as rainbow text, the toggle works fine, clicking once to activate, and clicking a second time to release the effect. this work well. But when the second click occur, a text is added "text en arc en ciel" I don't want this text ».
- Contraintes PROJECT_PLAN §7.1 (personnalisation posts, toolbar TipTap, effets néon/marquee/blink/blur), §8 mobile-first, §15 pipeline.
- L'éditeur TipTap a 4 marks (`rainbow`, `marqueeMark`, `blinkMark`, `blurMark`) exposés via `toggleRainbow` etc., avec un helper `toggleRetroMark` qui insère un placeholder quand la sélection est vide.

## Decision Points

### DP1 — Early return `isActive` avant insertion

- **choice** : `const markMap = {toggleRainbow:"rainbow",...}; const mark = markMap[markName]; if (editor.isActive(mark)) { /* handle collapsed */ ; editor.chain().focus()[markName]().run(); return; }` avant le test `selection.empty`.
- **rationale** : le second clic pour désactiver doit être idempotent : si le style est déjà actif, on le retire, on n'insère rien.
- **alternatives** : garder l'ancien `if (selection.empty) insert` → bug.
- **tradeoff** : une lecture d'état de plus, négligeable.

### DP2 — Collapsed inside : `getMarkRange` + `setTextSelection`

- **choice** : si `selection.empty` et `isActive`, récupérer `markType = editor.schema.marks[mark]` puis `range = getMarkRange($from, markType)` (import depuis `@tiptap/core`). Si `range` existe, faire `setTextSelection({from: range.from, to: range.to})` puis `toggle`, sinon `toggle` simple.
- **rationale** : `editor.chain().focus().toggleMark()` avec sélection vide ne fait que basculer le _stored mark_ (le prochain caractère tapé n'aura plus le style), mais le mot déjà inséré garde son `<span class="rainbow-text">`. Le test Playwright montrait `isActive false` mais `innerHTML` gardait le span → mismatch visuel. Sélectionner l'étendue marquée fait que le toggle s'applique au nœud existant et le retire du DOM.
- **alternatives** : `unsetMark` seul → même problème (stored mark seulement) ; sélectionner tout le bloc (`$from.start()/end()`) → enlèverait le style de tout le paragraphe, pas seulement du mot.
- **tradeoff** : dépend de `@tiptap/core` `getMarkRange`, déjà disponible (exporté, 0 deps).

### DP3 — Garder `placeholderFor` et insertion sélectionnée

- **choice** : quand `!isActive && selection.empty`, on garde le chemin existant : `insertContent(placeholder)` → `command` sélectionne le placeholder → `toggle`.
- **rationale** : c'est le comportement attendu pour le premier clic : insérer un mot d'exemple déjà stylé et sélectionné pour que l'utilisateur tape directement dedans.
- **tradeoff** : aucun.

## Implementation approach

- **Fichiers clés :**
  - `components/editor/RetroEditor.tsx` : import `getMarkRange` depuis `@tiptap/core`, ajout `markMap`, early return `isActive`, branche `range` + `setTextSelection`, sinon `toggle`.
  - `components/editor/retroMarks.ts` : inchangé (définit `rainbow` etc.).
- **Flux :**
  - 1er clic vide + `!isActive` → insert placeholder (17 chars) → sélectionne placeholder → `toggleRainbow` → `<p><span class="rainbow-text">texte arc-en-ciel</span></p>` + `isActive true` + bouton `pushed`.
  - 2e clic vide + `isActive` + `getMarkRange` → `setTextSelection(range)` → `toggleRainbow` → `<p>texte arc-en-ciel</p>` + `isActive false` + bouton inactif, pas de duplication.
  - Texte sélectionné `hello` → `isActive false` → `else` → `toggle` → `<span>hello</span>` ; re-clic `isActive true` → `toggle` → `<p>hello</p>`.

## Pitfalls & Environment

- **Stored mark vs node mark** : `toggleMark` avec sélection vide ne touche que le stored mark, pas le DOM. D'où la nécessité de `getMarkRange` + `setTextSelection` pour le cas collapsed.
- **Mark names** : `toggleRainbow` ↔ `rainbow`, `toggleMarquee` ↔ `marqueeMark`, etc. — mapping explicite évite les fautes.
- **Import path** : `getMarkRange` est dans `@tiptap/core` (re-exporté), pas dans `prosemirror-commands` directement.
- **Tests** : Vitest jsdom avec TipTap nécessite `Image` inline et `CarouselNode image*` cohérents, sinon `RangeError`.

## Lessons for future agents

- Pour tout toggle de mark TipTap avec placeholder, toujours tester `isActive` **avant** d'insérer ; sinon le second clic duplique.
- Quand `isActive` + `empty`, utiliser `getMarkRange($from, markType)` pour sélectionner l'étendue marquée avant de toggler, sinon le style reste visible.
- Garder `markMap` à l'extérieur de la fonction (perf) et typer `as const`.

## Linked reasoning / similar tasks

- task-memory/2026-09-03-editor-scrollable.md — scrollable middle, toolbar block
- task-memory/2026-09-03-carousel-fix.md — carousel content image* + inline:true
- task-memory/2026-08-31-editor-retro-features.md — toolbar, marks, néon
