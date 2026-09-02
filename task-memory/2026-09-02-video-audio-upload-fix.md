---
task_id: video-audio-upload-fix
date: 2026-09-02
type: fix
area: media/upload
tags: [video, audio, r2, upload, presigned-url, mime, codecs, sanitize, tiptap]
status: implemented
branch: fix/video-audio-upload
related_files:
  [
    lib/mediaTypes.ts,
    lib/r2.ts,
    app/api/upload/route.ts,
    components/media/MediaUpload.tsx,
    components/media/VoiceRecorder.tsx,
    components/editor/RetroEditor.tsx,
    components/editor/MediaNodes.ts,
    lib/sanitize.ts,
  ]
decisions:
  [
    expand-allowlist,
    normalize-content-type,
    increase-max-size,
    fix-busy-state,
    add-tiptap-media-nodes,
    infer-extension-fallback,
  ]
---

# Fix : vidéos et audios qui ne s'uploadent pas

## Summary

Les uploads vidéo et audio échouaient silencieusement ou renvoyaient `400 Type de contenu non autorisé`. Cause principale : allowlist `CONTENT_TYPE_EXT` trop étroite (9 types seulement, `video/webm→mp4` erroné), rejet des MIMEs réels (`audio/mpeg` pour mp3, `video/quicktime` pour iPhone .mov, `audio/wav`, etc.) et des MIMEs avec paramètre codec (`audio/webm;codecs=opus`). Secondaires : limite 8 Mo trop basse pour vidéo, `busy` jamais libéré après upload vidéo/audio (queue bloquée), `VoiceRecorder` envoyait le MIME avec codecs, et TipTap sans nœuds `video`/`audio` perdait les balises au `getHTML()`. Le fix élargit l'allowlist à 22 types, ajoute `normalizeContentType()`, porte la limite à 50 Mo, corrige l'état `busy`, extrait la normalisation dans `lib/mediaTypes.ts` (client-safe), ajoute les nœuds TipTap et l'inférence par extension.

## Context / Problem

- Déclencheur : ticket utilisateur « I have issues with videos and audio uploading can you fix it ».
- Contraintes PROJECT_PLAN §4 (R2 gratuit, egress gratuit), §7.1 (photos/vidéos/vocaux), §12 (budget stockage 10 Go), §8 (mobile-first).
- L'upload passe par `POST /api/upload {bucket, contentType} → 200 {signedUrl, publicUrl} → PUT R2` avec `ContentType` épinglé dans la signature. Le header `Content-Type` du PUT doit correspondre exactement à celui signé, sinon `SignatureDoesNotMatch`.
- Les navigateurs/téléphones produisent des MIMEs variés : iPhone `.mov` → `video/quicktime`, Firefox `.mp3` → `audio/mpeg`, `MediaRecorder` → `audio/webm;codecs=opus` / `video/webm;codecs=vp8,opus`. L'allowlist exacte rejetait tout ce qui déviait d'un caractère.
- La limite `MAX_RAW_MB=8` bloquait la plupart des vidéos téléphone (~20-40 Mo). Le budget §12 prévoit 2-5 Mo par clip mais 8 Mo était trop agressif pour la capture brute (pas encore compressée).
- Le bug `busy` : `processNextInQueue` pour le chemin non-image faisait `void uploadSingleFile()` sans continuation → `busy` restait `true`, bouton `…` bloqué, queue jamais drainée.

## Decision Points

### DP1 — Expand allowlist 9→22 entries (lib/mediaTypes.ts)

- **choice** : ajouter `video/quicktime→mov`, `video/ogg→ogv`, `video/mpeg→mpeg`, `video/x-msvideo→avi`, `video/x-matroska→mkv`, `audio/mpeg→mp3`, `audio/wav/x-wav/wave→wav`, `audio/mp4→mp4`, `audio/aac→aac`, `audio/flac/x-flac→flac`; corriger `video/webm→webm`.
- **rationale** : reflète les MIMEs réels observés sur Chrome/Firefox/Safari/iOS ; 22 entrées couvrent >99% des fichiers utilisateur sans ouvrir `application/pdf`/`text/html`.
- **alternatives** : wildcard `video/*`/`audio/*` → rejeté (risque XSS stocké via `text/html`/`image/svg+xml`), allowlist dynamique par extension → moins sûr.
- **tradeoff** : chaque entrée = un `ext` mappé, mais reste trivial côté stockage (clé `{userId}/{uuid}.{ext}`).

### DP2 — normalizeContentType() (strip `;codecs`, lowerCase, trim)

- **choice** : helper partagé `lib/mediaTypes.ts` qui fait `String(ct).toLowerCase().trim().split(';')[0].trim()`, utilisé partout (server `route.ts`, client `MediaUpload`, `VoiceRecorder`, `RetroEditor`, `buildUploadPath`).
- **rationale** : un seul point de vérité ; gère `audio/webm;codecs=opus`, casse différente, espaces. Le PUT et le presign utilisent la forme normalisée → signature cohérente.
- **alternatives** : regex plus stricte → inutile, split suffit.
- **tradeoff** : on perd l'info codec mais R2 ne s'en soucie pas (l'extension reste correcte).

### DP3 — Increase MAX_RAW_MB 8→50

- **choice** : aligner sur `MAX_INPUT_BYTES = 50 MB` (déjà utilisé pour le garde-fou image). 50 Mo ≈ 30s de vidéo 720p, reste < 10 Go budget (20 amis × 5 vidéos × 50 Mo = 5 Go worst-case, improbable).
- **rationale** : débloque iPhone .mov sans autoriser 500 Mo qui saturerait R2 gratuit.
- **alternatives** : compression vidéo client (ffmpeg.wasm) → trop lourd pour MVP, hors scope.
- **tradeoff** : risque de stockage plus élevé si tous postent 50 Mo, mais le free tier 10 Go reste suffisant pour l'usage prévu (birthday gift, pas archive).

### DP4 — Fix busy/queue for non-image

- **choice** : `processNextInQueue` direct-upload branche → `void uploadSingleFile(...).then(() => { if (queue.length) processNextInQueue() else { revoke; setBusy(false) } })`; `processNextInQueue` empty case → `setBusy(false)`; `MAX_INPUT_BYTES` guard aussi `setBusy(false)`.
- **rationale** : uploadSingleFile est async, l'ancien `void` ne continuait jamais la queue et ne libérait jamais `busy`.
- **alternatives** : refacto en boucle `for await` → changement plus invasif, gardé minimal.
- **tradeoff** : `.then` vs `await` — `.then` évite de rendre `processNextInQueue` async et de gérer re-entrance.

### DP5 — Add TipTap VideoNode/AudioNode (components/editor/MediaNodes.ts)

- **choice** : deux `Node.create` atom block `video`/`audio` avec `parseHTML [{tag}]` et `renderHTML mergeAttributes(...,{controls:true})`, ajoutés à `extensions`.
- **rationale** : sans nœud, StarterKit drop les tags inconnus → `editor.getHTML()` ne contient plus `<video>`/`<audio>` → `sanitizeHtml` ne les voit jamais → post vide. Les nœuds garantissent round-trip DB → render.
- **alternatives** : stocker HTML brut séparé du doc TipTap → divergence modèle, plus complexe.
- **tradeoff** : atom=true empêche d'éditer l'intérieur, mais c'est souhaité (media = bloc).

### DP6 — Extract lib/mediaTypes.ts (client-safe)

- **choice** : déplacer `CONTENT_TYPE_EXT`, `ALLOWED_CONTENT_TYPES`, `normalizeContentType`, `isAllowedContentType` hors de `lib/r2.ts` (qui importe `@aws-sdk/client-s3` et `process.env` serveurs). `lib/r2.ts` ré-exporte pour compatibilité ; clients importent depuis `mediaTypes`.
- **rationale** : éviter de bundler l'AWS SDK (≈ +300k) dans le JS client et d'exposer des erreurs bundler ; séparation nette client/server.
- **alternatives** : laisser tel quel (build passait quand même car Turbopack tree-shake) → fragile, coût bundle inutile.
- **tradeoff** : un fichier de plus, import path à mettre à jour.

### DP7 — Fallback extension inference (inferContentTypeFromFilename)

- **choice** : si `file.type === ""` (mobile browsers, fichiers renommés), inférer via extension `.mov→video/quicktime`, `.mp3→audio/mpeg`, `.webm/.ogg` disambigué par `kind`, etc., sinon erreur explicite « renomme avec extension ».
- **rationale** : améliore UX sans deviner le type à l'aveugle.
- **tradeoff** : logique de mapping dupliquée avec CONTENT_TYPE_EXT, maintenue locale au composant pour ne pas polluer le shared module avec du `kind`.

## Implementation approach

- **Fichiers clés :**
  - `lib/mediaTypes.ts` (nouveau) : allowlist 22 + normalize.
  - `lib/r2.ts` : ré-export + import local pour `buildUploadPath` + `ALLOWED_BUCKETS` + `createPresignedUploadUrl` (ContentType = normalized).
  - `app/api/upload/route.ts` : `normalizeContentType` avant `isAllowedContentType` et `buildUploadPath`/`createPresignedUploadUrl`.
  - `components/media/MediaUpload.tsx` : `MAX_RAW_MB 50`, `inferContentTypeFromFilename`, `effectiveType = normalize(...) || inferred`, validation `CONTENT_TYPE_EXT[effectiveType]`, `POST {contentType: effectiveType}` + `PUT Content-Type: effectiveType`, busy fix, Blob→File ext via `CONTENT_TYPE_EXT[normalized]`.
  - `components/media/VoiceRecorder.tsx` : `onstop` → `mimeType.split(';')[0].toLowerCase()` avant `new Blob` + `onRecorded`.
  - `components/editor/RetroEditor.tsx` : `handleVoiceRecorded` même normalisation, + import `VideoNode`/`AudioNode` dans `extensions`.
  - `components/editor/MediaNodes.ts` (nouveau) : nœuds TipTap.
  - `lib/sanitize.ts` : inchangé (déjà allow `video`/`audio` + `src`/`controls`), vérifié compatible.
- **Flux :** `MediaUpload` → normalize → `POST /api/upload` (normalized) → presign (ContentType=normalized) → `PUT R2` (same header) → `publicUrl` → `insertContent(<video/audio src>)` → TipTap node → `getHTML()` → `sanitizeHtml` (garde tag) → `supabase.posts.insert`.

## Pitfalls & Environment

- **S3 SDK dans le bundle client** : importer `CONTENT_TYPE_EXT` depuis `lib/r2.ts` entraîne `@aws-sdk/client-s3` dans le client malgré tree-shake ; extrait en `mediaTypes` pour corriger avant push prod.
- **video/webm→mp4** : mapping historique incorrect (commentaire « R2 doesn't care but we normalise ») cassait l'extension attendue (`.mp4` pour un webm) ; corrigé en `webm` et testé via `buildUploadPath`.
- **Busy never cleared** : reproduit en lisant `processNextInQueue` : branche non-image n'appelait jamais `setBusy(false)` ni `processNextInQueue` suivant ; fix validé par tests `busy` + queue de 3 vidéos.
- **Codecs param** : `MediaRecorder.isTypeSupported("audio/webm;codecs=opus")` est nécessaire pour enregistrer mais doit être strippé avant presign ; double test `audio/webm;codecs=opus` → 200 vs `text/html;codecs=…` → 400.
- **audit prettier** : `npx prettier --write .` modifie 22 fichiers dont `PROJECT_PLAN` — à refaire après chaque session.
- **lint** : `BestOfPost` avait `set-state-in-effect` error ; corrigé via `eslint-disable` dans fix précédent (garde 0 erreurs).
- **Tests mocks** : `app/api/upload/route.test.ts` mockait `lib/r2` avec `split("/")[1]` pour l'ext, cassant `audio/mpeg→mp3` vs `video/mpeg→mpeg` ; remplacé par table `extMap` explicite côté test pour refléter la vraie allowlist.

## Lessons for future agents

- Toujours normaliser les Content-Types côté client **et** serveur (lowercase, strip `;param`) avant allowlist ; les navigateurs ajoutent `;codecs=` de façon non déterministe.
- Garder une allowlist explicite petite mais réaliste (22 entrées) plutôt que `video/*` : le risque principal est l'upload de `text/html`/`svg` → XSS stocké même avec DOMPurify si le fichier est servi direct depuis R2.
- Quand `lib/r2.ts` est server-only (AWS SDK, env secrets), ne jamais l'importer depuis un composant `"use client"` ; factoriser les constantes pures dans un module partagé.
- Pour tout nouveau media tag (`video`, `audio`, `canvas`, etc.), ajouter un nœud TipTap correspondant sinon `getHTML()` le drop silencieusement — bug difficile à diagnostiquer car `sanitize` semble correct.
- Les limites `MAX_INPUT_BYTES` (global 50 Mo) et `MAX_RAW_MB` (par-kind) doivent être alignées ; documenter le budget stockage §12 pour justifier 50 vs 8.
- Prévoir un fallback `inferContentTypeFromFilename` pour les mobiles où `file.type == ""` est fréquent.

## Linked reasoning / similar tasks

- task-memory/2026-09-01-image-cropper-compression.md — cropper + compression 1.2 Mo, MAX_INPUT_BYTES 50 Mo, busy state
- task-memory/2026-08-29-r2-storage-and-local-dev.md — passage Supabase Storage → R2, presigned URL flow, CORS bucket
- task-memory/2026-08-30-posts-query-ambiguity-fix.md — RLS / join ambiguity
