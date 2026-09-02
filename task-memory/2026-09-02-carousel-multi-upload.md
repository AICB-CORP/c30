---
task_id: carousel-multi-upload
date: 2026-09-02
type: feat
area: media/carousel
tags: [carousel, multi-upload, batch, tiptap, sanitize, media]
status: implemented
branch: feat/carousel-multi-upload
related_files: [components/media/MediaUpload.tsx, components/editor/CarouselNode.ts, components/editor/RetroEditor.tsx, lib/sanitize.ts, app/globals.css, components/editor/MediaNodes.ts]
decisions: [batch-upload-callback, carousel-node, sanitize-data-carousel, responsive-carousel, busy-guard]
---

# Carousel pour uploads multiples + fix « seul le dernier reste »

## Summary

Quand l'utilisateur sélectionnait plusieurs images (multiple), seul le dernier fichier restait dans le post. Cause : inserts `onUploaded` séquentiels en `insertContent` avec race + absence de callback batch ; le `busy` restait bloqué pour vidéo/audio et la sauvegarde pouvait partir avant la fin des PUT. Ajout d'un mode batch (`onBatchUploaded`) : les fichiers d'un même choix sont collectés puis insérés en une seule transaction. Si `useCarousel` (défaut true) et `batch.length>1`, ils sont groupés en `<div class="retro-carousel" data-carousel="true"><img…>…</div>` via un nouveau nœud TipTap `CarouselNode` ; sinon ils sont insérés inline en une fois. Le carrousel est stylé en scroll-snap horizontal, responsive (`min(280px,70vw)`, `clamp`), et est préservé par `sanitizeHtml` (allow `data-carousel` restreint à `div[data-carousel="true"]`). Le bouton Publier est désactivé tant que `mediaBusy`.

## Context / Problem

- Déclencheur : ticket « when uploading many files, only the last one remains… maybe carousel »
- Contraintes PROJECT_PLAN §2/§8 mobile-first (Caroline sur téléphone), §7.1 (multiples posts, mots croisés), §4 R2 gratuit, §12 budget 10 Go.
- Le flux précédent : `MediaUpload(kind=image, multiple, enableCropper)` → queue → cropper par image → `uploadSingleFile` → `onUploaded(path,url)` → `editor.chain().focus().insertContent(<img>)`. Chaque insert est une transaction séparée ; la sélection ProseMirror peut revenir au même endroit si l'image est `atom:true` et l'insertion trop rapide → seul le dernier survit. De plus, `processNextInQueue` pour le chemin non-cropper faisait `void upload()` sans continuation → `busy` jamais libéré.
- L'utilisateur veut aussi une présentation carrousel pour les lots d'images, sinon inline dans le texte.

## Decision Points

### DP1 — Batch callback `onBatchUploaded` (MediaUpload)
- **choice** : ajout `onBatchUploaded?: (uploads:{path,url}[])=>void` + `onBusyChange`, `batchUploadsRef`. Quand `onBatchUploaded` existe et `total>1`, `uploadSingleFile` pousse dans `batchUploadsRef` au lieu d'appeler `onUploaded` ; à la fin du lot (`queue empty` dans `processNextInQueue` et `handleCropperConfirm`), on appelle `onBatchUploaded(batch)` une fois puis `setBusy(false)`. Pour `total==1` on garde le chemin per-file pour compat.
- **rationale** : une seule transaction `insertContent(htmlAvecToutesLesImages)` évite la race et garantit que tout reste ; le carrousel a besoin de tous les URLs d'un coup.
- **alternatives** : garder per-file et fixer la race via `focus('end')` → moins robuste, ne résout pas le besoin carrousel.
- **tradeoff** : double API (`onUploaded` + `onBatchUploaded`) mais rétro-compatible (tests sans batch continuent à passer).

### DP2 — CarouselNode TipTap
- **choice** : `Node.create({name:'carousel', group:'block', content:'inline*', isolating:true, draggable:true, parseHTML:[{tag:'div[data-carousel]'},{tag:'div.retro-carousel'}], renderHTML: div[data-carousel="true"].class=retro-carousel})`, contenu `inline*` pour accueillir des `image` inline.
- **rationale** : sans nœud, StarterKit drop le wrapper div et les images deviennent des paragraphes séparés ou seul le dernier est gardé. `isolating` évite que le curseur s'échappe au milieu du carrousel.
- **alternatives** : stocker le carrousel en HTML brut via `RawHtml` data-ohtml → plus générique mais moins sémantique.
- **tradeoff** : `class` forcée à `retro-carousel` côté parse/render pour éviter l'injection de classes arbitraires (sécu/style).

### DP3 — Sanitize `data-carousel` restreint
- **choice** : `GLOBAL_ATTRS += "data-carousel"` + hook `afterSanitizeAttributes` qui supprime `data-carousel` si `tag!=="div"` ou `value!=="true"`.
- **rationale** : permet au carrousel de survivre à `sanitizeHtml` tout en évitant que n'importe quel tag ne porte `data-carousel` pour déclencher le CSS.
- **alternatives** : mettre `data-carousel` seulement dans `ATTRS_BY_TAG.div` → nécessite création de l'entrée div.
- **tradeoff** : hook supplémentaire mais négligeable.

### DP4 — Responsive carrousel
- **choice** : `display:flex; overflow-x:auto; scroll-snap-type:x mandatory; max-width:100%; box-sizing:border-box;` + `img {width:min(280px,70vw); height:clamp(140px,38vw,200px)}` + `@media(max-width:640px){gap/padding 0.5rem}`.
- **rationale** : 280px fixe déborde sur iPhone 320px (`retro-box w-[95vw]` → ~300px). Le clamp assure que le carrousel reste dans la viewport et que le scroll est interne, pas le page scroll.
- **alternatives** : largeur fixe + `overflow-x:hidden` → cache images.
- **tradeoff** : `70vw` dépend de la viewport, pas du conteneur, mais suffisant pour le MVP.

### DP5 — Guard `mediaBusy` + voix
- **choice** : `MediaUpload` expose `onBusyChange` via `useEffect([busy])`; `RetroEditor` tient `mediaBusy` et désactive Publier (`disabled={saving||mediaBusy}`) + message « Envoi en cours… ». `handleVoiceRecorded` fait `setMediaBusy(true)…finally{false}`.
- **rationale** : empêche de sauvegarder un post incomplet (images manquantes). La voix faisait son propre fetch hors `MediaUpload`, donc non couvert avant.
- **alternatives** : bloquer côté `handleSave` via `editor.getHTML().includes("blob:")` → fragile.
- **tradeoff** : un état de plus, mais simple.

### DP6 — Toggle Carrousel
- **choice** : checkbox `useCarousel` (défaut true) à côté du bouton Photos ; `onBatchUploaded` choisit `if(useCarousel && uploads.length>1) => div.retro-carousel else => imgs inline`.
- **rationale** : l'utilisateur veut l'option carrousel vs inline.
- **alternatives** : toujours carrousel pour >1 → moins flexible.
- **tradeoff** : un état UI de plus, mais explicite.

## Implementation approach

- **Fichiers clés :**
  - `components/media/MediaUpload.tsx` : ajout `onBatchUploaded`, `onBusyChange`, `batchUploadsRef`, reset batch au début de `startBatch` / `onInputChange`, suppression per-file quand batch actif, fire batch dans `processNextInQueue` empty, `.then` else, `handleCropperConfirm` empty, clear batch sur `MAX_INPUT_BYTES` et `handleCropperCancel`, `useEffect` busy notify.
  - `components/editor/CarouselNode.ts` (nouveau) : nœud TipTap block `inline*`.
  - `components/editor/RetroEditor.tsx` : import `CarouselNode` dans `extensions`, états `useCarousel`/`mediaBusy`, MediaUpload image passe `onUploaded` (fallback single) + `onBatchUploaded` (carousel vs inline) + `onBusyChange`, MediaUpload vidéo/audio passent `onBusyChange`, `handleVoiceRecorded` avec `mediaBusy`, bouton Publier disabled, message d'attente, CSS carousel dans `style`.
  - `lib/sanitize.ts` : `GLOBAL_ATTRS += data-carousel` + hook restriction.
  - `app/globals.css` : `.retro-carousel` global + responsive.
- **Flux multi-images :** pick 3 fichiers → queue 3 → cropper 1 → upload → batch[1] → cropper 2 → upload → batch[2] → cropper 3 → upload → batch[3] → queue empty → `onBatchUploaded([3])` → `insertContent(<div data-carousel>3×<img></div>)` → `getHTML()` → `sanitizeHtml` garde div+imgs → DB → `PostCard` `dangerouslySetInnerHTML` → CSS scroll-snap.
- **Flux single :** pick 1 fichier → `total==1` → `onUploaded` direct → insert inline.

## Pitfalls & Environment

- **Busy jamais libéré** : l'ancien chemin direct `void upload().then()` ne faisait `setBusy(false)` que dans le `else` sans passer par `processNextInQueue`; ajouté la même logique batch + `setBusy(false)` et `useEffect` pour notifier le parent.
- **Sanitize strip** : sans `data-carousel` dans `GLOBAL_ATTRS`, le carrousel était vidé après save (div nu sans attribut, images hors div). Ajout + hook restreint fixé.
- **TipTap strip** : sans `CarouselNode`, le div était drop et les images se retrouvaient en paragraphes séparés ; l'ajout du nœud a fait passer `getHTML()` de 1 img à 3 imgs en test manuel.
- **Responsive** : premier jet `width:280px` débordait sur iPhone 12 mini (375px) ; corrigé avec `min(280px,70vw)` et `max-width:100%` après review.
- **Prettier cascade** : `npx prettier --write .` retouche 21 fichiers dont des docs hors scope ; accepté pour respecter le pipeline.

## Lessons for future agents

- Pour tout upload multiple, préférer un **callback batch atomique** plutôt que N callbacks per-file si l'éditeur a une transaction par insert — évite la race « seul le dernier reste ».
- Tout nouveau wrapper block (carrousel, grille, etc.) nécessite un **nœud TipTap dédié** + **allowlist sanitize** + **CSS global** pour survivre au cycle `insertContent → getHTML → sanitize → render`.
- Toujours exposer `onBusyChange` depuis les composants d'upload et désactiver la sauvegarde tant que `busy` — sinon l'utilisateur publie un post incomplet.
- Responsive : tester sur 320px (`w-[95vw]`) ; un `width` fixe > `70vw` casse le layout mobile, privilégier `min()`/`clamp()` et `max-width:100%`.
- Garder `lib/mediaTypes.ts` comme source unique des MIMEs ; ne pas dupliquer la map d'extension dans l'inférence sans raison.

## Linked reasoning / similar tasks

- task-memory/2026-09-02-video-audio-upload-fix.md — allowlist 23, normalize codecs, MAX 50, busy fix, TipTap video/audio nodes
- task-memory/2026-09-01-image-cropper-compression.md — cropper queue, MAX_INPUT_BYTES 50, batch pattern
- task-memory/2026-08-29-r2-storage-and-local-dev.md — R2 presigned flow, CORS
