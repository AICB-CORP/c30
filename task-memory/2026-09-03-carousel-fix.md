---
task_id: carousel-fix
date: 2026-09-03
type: fix
area: editor/carousel
tags: [carousel, tiptap, image, inline, block, batch, sanitize]
status: implemented
branch: fix/carousel-not-working
related_files:
  [
    components/editor/CarouselNode.ts,
    components/editor/RetroEditor.tsx,
    lib/sanitize.ts,
    app/globals.css,
  ]
decisions: [carousel-content-image, image-inline-true, insertCarousel-json, sanitize-preserve]
---

# Fix : carrousel ne s'affichait pas

## Summary

Le carrousel multi-images ne s'affichait pas après upload : seul le dernier fichier restait ou le bloc carrousel était vide après sauvegarde. Cause : `CarouselNode` déclarait `content: "inline*"` alors que l'extension `Image` de TipTap est par défaut `group:"block"` (`inline:false`). L'insertion JSON `insertCarousel({urls})` avec `content: [{type:"image"}]` levait `RangeError: Invalid content for node carousel` et l'insertion HTML string via `insertContent('<div><img>')` était masquée par la race per-file (seul le dernier survivait). Le fix passe `CarouselNode` à `content: "image*"` et configure `Image` en `inline:true` dans `RetroEditor`, et utilise désormais la commande `insertCarousel` (JSON) pour les batches carrousel, garantissant un wrapper unique avec N images qui survit à `getHTML() → sanitizeHtml() → PostCard`.

## Context / Problem

- Déclencheur : ticket « the carousel doesn't work can you try to fix it ? » après le fix multi-upload batch + carrousel.
- Contraintes PROJECT_PLAN §7.1 (éditeur riche, carrousel optionnel), §8 rétro (scroll-snap), §10 stealth, §4 zero-budget.
- Le carrousel avait été implémenté en deux couches : `CarouselNode` (TipTap block `inline*`) + `MediaUpload` batch (`onBatchUploaded`) + `RetroEditor` insertion HTML string `<div data-carousel><img>…</div>`. Les tests unitaires `CarouselNode.test.ts` utilisaient `Image.configure({inline:true})` comme workaround et passaient, masquant le bug en prod où `Image` était utilisé sans `inline:true`.
- En prod, `insertCarousel({urls:['a.jpg','b.jpg']})` via JSON échouait silencieusement (RangeError non catché, `editor.chain().run()` renvoie false, aucun nœud inséré) → l'utilisateur voyait 0 image ou seulement la dernière via le fallback per-file.

## Decision Points

### DP1 — Carousel content `inline*` → `image*`

- **choice** : `CarouselNode` `content: "image*"` au lieu de `"inline*"`.
- **rationale** : `image*` n'accepte que des nœuds `image` (block par défaut), plus strict que `inline*` (qui aurait aussi accepté texte, ce qui n'est pas souhaité dans un carrousel d'images). Avec `Image` en `inline:true`, `image*` reste valide car l'image devient inline et est aussi acceptée comme `image` (le nom du nœud ne change pas).
- **alternatives** : garder `inline*` et configurer `Image` inline:true → aurait aussi fixé, mais `image*` est plus sémantique (carrousel = que des images).
- **tradeoff** : si un jour on veut du texte/caption dans le carrousel, il faudra passer à `(image|paragraph)*` et ré-auditer `sanitize`.

### DP2 — Image `inline:true` dans RetroEditor

- **choice** : `Image.configure({ inline: true })` (au lieu de `Image` brut) dans `RetroEditor` extensions.
- **rationale** : rend `Image` compatible avec `CarouselNode` `image*` quand l'image est considérée comme inline dans le bloc carrousel, et comme inline dans les paragraphes (texte + image côte à côte). Le test `CarouselNode` qui utilisait déjà `inline:true` comme workaround passe désormais sans workaround en prod.
- **alternatives** : laisser `Image` block et mettre `CarouselNode` `content: "block*"` → aurait aussi accepté les images block, mais les images block dans un `div flex` scroll horizontal se comportent moins bien (elles sont block, pas flex items).
- **tradeoff** : `inline:true` change le comportement des images standalone (elles deviennent inline dans les paragraphes, pas de saut de ligne automatique). Acceptable pour le style rétro où les images sont souvent inline dans le texte ; les carrousels restent block.

### DP3 — Insertion via commande JSON `insertCarousel` au lieu de HTML string

- **choice** : `CarouselNode` ajoute `addCommands() { insertCarousel: ({urls}) => ({chain}) => chain().insertContent({type:'carousel', attrs:{'data-carousel':'true',class:'retro-carousel'}, content: urls.map(url=>({type:'image',attrs:{src:url,alt:''}}))}).run() }` et `RetroEditor` l'appelle via `editor.chain().focus().insertCarousel({urls}).run()` pour les batches carrousel.
- **rationale** : l'insertion JSON via le schéma est atomique et validée par le schéma (pas de parsing HTML lenient qui peut drop le wrapper). Elle évite la race HTML string où `insertContent('<div><img><img>')` pouvait être parsé comme deux images hors carrousel si le `CarouselNode` n'était pas reconnu à temps.
- **alternatives** : garder HTML string → masquait le bug `content` mismatch car le DOMParser est permissif et acceptait `<img>` même si le schéma dit `inline*`.
- **tradeoff** : une commande de plus, mais typée et testée.

### DP4 — Garder fallback HTML pour inline batch

- **choice** : pour les batches non-carrousel (`useCarousel false` ou `uploads.length==1`), garder `insertContent(htmlString)` avec `html = uploads.map(u=>`<img src="${u.url}">`).join("")`.
- **rationale** : les images inline multiples via HTML string fonctionnent toujours (testées) et ne nécessitent pas de wrapper.
- **tradeoff** : deux chemins d'insertion, mais couverts par tests.

## Implementation approach

- **Fichiers clés :**
  - `components/editor/CarouselNode.ts` : `content: "image*"` (was `inline*`), `addAttributes` force `data-carousel true` + `retro-carousel`, `addCommands insertCarousel` (JSON), `parseHTML`/`renderHTML` inchangés.
  - `components/editor/RetroEditor.tsx` : `Image.configure({ inline: true })`, `onBatchUploaded` pour `useCarousel && >1` appelle `insertCarousel({urls})` au lieu de `insertContent(html)`, sinon HTML inline.
  - `lib/sanitize.ts` / `app/globals.css` : inchangés (déjà allow `data-carousel`, flex scroll-snap).
- **Flux corrigé :** pick 3 fichiers → `MediaUpload` batch `[a,b,c]` → `RetroEditor` `onBatchUploaded([3])` → `if(useCarousel)` → `editor.chain().focus().insertCarousel({urls:[a,b,c]}).run()` → TipTap crée `carousel` node avec 3 `image` enfants → `getHTML()` → `<div data-carousel="true" class="retro-carousel"><img src="a"><img src="b"><img src="c"></div>` → `sanitizeHtml` garde div+imgs → DB → `PostCard` `sanitizeHtml` → `post-content` flex scroll.

## Pitfalls & Environment

- **Masquage par tests** : `CarouselNode.test.ts` utilisait `Image.configure({inline:true})` comme workaround local, donc les tests passaient même quand la prod avait `Image` block. Le bug n'a été visible qu'en prod. Leçon : les tests d'intégration doivent utiliser la **même config** que `RetroEditor` (maintenant `Image inline:true` dans les deux).
- **RangeError silencieux** : `insertCarousel` avec `content image*` et `Image` block levait `RangeError` mais TipTap le catch et `run()` renvoie false sans log, donc l'éditeur restait vide sans erreur visible. Le fix rend l'erreur impossible.
- **Prettier cascade** : `npx prettier --write .` retouche 21 fichiers ; accepté.
- **Tiptap schema strictness** : le DOMParser HTML est permissif, le JSON ne l'est pas — d'où la divergence entre HTML string (qui passait) et JSON (qui échouait).

## Lessons for future agents

- Quand un nœud TipTap a `content: "inline*"` et qu'il doit contenir des `image`, **toujours** vérifier que `Image` est configuré `inline:true` ou changer le nœud à `image*`/`block*`. Le mismatch `inline*` vs `block` est silencieux en HTML mais bloquant en JSON.
- Préférer l'insertion **JSON via commande** (`insertContent({type, content})`) pour les wrappers block avec enfants, plutôt que HTML string, pour bénéficier de la validation de schéma et éviter la race per-file.
- Garder les tests d'intégration TipTap avec la **même extension config** que la prod (`RetroEditor`).

## Linked reasoning / similar tasks

- task-memory/2026-09-02-carousel-multi-upload.md — batch + carrousel initial (HTML string, inline* bug)
- task-memory/2026-09-02-video-audio-upload-fix.md — allowlist 23, normalize, MAX 50
- task-memory/2026-09-03-editor-scrollable.md — scrollable middle, toolbar sticky, busyMap
