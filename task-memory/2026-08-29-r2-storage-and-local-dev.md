---
task_id: r2-storage-and-local-dev
date: 2026-08-29
type: feat
area: storage/r2 + infra/local-dev
tags: [storage, r2, cloudflare, supabase, local-dev, presigned-url, s3, migration, vitest, env]
status: review
branch: feat/local-dev-setup
related_files:
  - lib/r2.ts
  - app/api/upload/route.ts
  - components/media/MediaUpload.tsx
  - components/editor/RetroEditor.tsx
  - .env.example
  - lib/r2.test.ts
  - app/api/upload/route.test.ts
  - supabase/config.toml
  - docs/LOCAL_DEV.md
  - supabase/migrations/0002_storage_buckets.sql (deleted)
decisions:
  - r2-over-supabase-storage
  - presigned-put-publicurl-contract
  - server-only-r2-secrets
  - single-r2-bucket-key-prefix
  - vitest-node-env-directive
  - tsconfig-exclude-vitest-config
  - vitest-setup-jestdom-removed
  - local-supabase-dev
  - r2-cors-put-localhost
---

# Task: Cloudflare R2 comme stockage + setup dev local (Supabase local, Vercel prod)

## Summary

On remplace **Supabase Storage** par **Cloudflare R2** (S3-compatible) pour tous les médias
(photos, vidéos, notes vocales, avatars) du Skyblog. Le endpoint `/api/upload` mint désormais une
URL présignée PUT (write-scoped, 600 s, content-type épinglé) **plus** l'URL publique finale, que le
client consomme directement. Dans la foulée, on prépare le **dev local** : Supabase tourne en local
via Docker (Supabase CLI), R2 reste cloud, et Vercel deviendra la prod. Aucune clé externe pour
Supabase local ; seules les credentials R2 (créées par l'utilisateur dans Cloudflare) sont nécessaires.

## Context / Problem

- `PROJECT_PLAN.md` §12 pointait la limite 1 Go de Supabase Storage comme risque de coût ; R2 offre
  10 Go + egress gratuit.
- Le code construisait l'URL publique côté client à partir de `NEXT_PUBLIC_SUPABASE_URL`
  (`/storage/v1/object/public/...`) → couplage au storage Supabase.
- Pas de déploiement Vercel encore existant : l'utilisateur veut dev local (Supabase local) puis
  Vercel en prod.
- Budget zéro (§4) respecté : R2 free-tier.

## Decision Points

### r2-over-supabase-storage

- **choice**: Cloudflare R2 via `@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`.
- **rationale**: S3-compatible, 10 Go + egress gratuits, découple le stockage de Supabase (qui reste
  pour Auth/DB/RLS).
- **alternatives**: rester Supabase Storage (limite 1 Go) — rejeté pour coût/scale ; R2 déjà prévu §14.1.
- **tradeoff**: nécessite config CORS R2 + token API scoped ; Supabase Storage gérait le "public"
  nativement.

### presigned-put-publicurl-contract

- **choice**: le serveur retourne `{ uploadPath, signedUrl, publicUrl }` ; le client n'utilise que `publicUrl`.
- **rationale**: centralise la construction d'URL côté serveur, évite de fuiter la logique storage dans
  le client, et `R2_PUBLIC_URL` reste server-only.
- **alternatives**: reconstruire l'URL côté client (ancien comportement).
- **tradeoff**: le client perd la capacité de deviner l'URL, mais c'est voulu (simplicité + sécurité).

### server-only-r2-secrets

- **choice**: `R2_*` (sauf `R2_PUBLIC_URL`, simple URL de lecture) jamais préfixés `NEXT_PUBLIC_` ;
  secrets lus uniquement dans `lib/r2.ts` (route serveur `runtime="nodejs"`).
- **rationale**: empêche toute fuite de `R2_SECRET_ACCESS_KEY` dans le bundle client (revue sécu).
- **tradeoff**: aucun.

### single-r2-bucket-key-prefix

- **choice**: un seul bucket R2 (`R2_BUCKET_NAME`), clé = `${bucket}/${user.id}/${uuid}.${ext}` ;
  `avatars`/`post-media` deviennent des préfixes (le front n'utilise que `post-media`, cf §14.1.7).
- **rationale**: un seul bucket suffit ; le namespacing par `user.id` empêche l'écrasement inter-users.
- **tradeoff**: pas d'isolation stricte par bucket, mais inutile ici.

### vitest-node-env-directive

- **choice**: ajout de `// @vitest-environment node` dans `lib/utils.test.ts`, `lib/invites.test.ts`,
  `lib/r2.test.ts`, `app/api/upload/route.test.ts`.
- **rationale**: dans ce sandbox, l'environnement `jsdom` (défaut) fige le worker de test ; `node`
  fait passer la suite (32 tests).
- **tradeoff**: les futurs tests de composants devront opter pour jsdom via la même directive.

### tsconfig-exclude-vitest-config

- **choice**: `tsconfig.json` exclut `vitest.config.ts` et `vitest.setup.ts`.
- **rationale**: conflit de types préexistant `@vitejs/plugin-react`@6 (vite@8) ↔ vitest@3.2.7 (vite@7)
  qui casse `tsc` sur le seul fichier de config de test.
- **tradeoff**: réduit la couverture de type de ces deux fichiers ; follow-up = aligner les majors. Non bloquant.

### vitest-setup-jestdom-removed

- **choice**: suppression de l'import global `@testing-library/jest-dom/vitest` dans `vitest.setup.ts`
  (avec commentaire documentant l'import par fichier pour les tests de composants).
- **rationale**: cet import figeait le worker dans le sandbox ; aucun test du dépôt ne l'utilise.
- **tradeoff**: les futurs tests de composants doivent importer jest-dom explicitement.

### local-supabase-dev

- **choice**: dev local via Supabase CLI (`supabase start`, Docker), URL/keys locaux dans `.env.local` ;
  R2 reste cloud.
- **rationale**: pas de dépendance externe pour Supabase en dev ; env-driven, donc aucun changement de code.
- **tradeoff**: nécessite Docker + Supabase CLI installés.

### r2-cors-put-localhost

- **choice**: CORS R2 autorise `PUT`/`OPTIONS` depuis `http://localhost:3000` **et** l'origine Vercel,
  avec `AllowedHeaders: [Content-Type]`.
- **rationale**: le navigateur PUT directement vers R2 → preflight cross-origin ; sinon échec en dev local.
- **tradeoff**: en prod on peut resserrer à l'origine Vercel uniquement.

## Implementation approach

- `lib/r2.ts` (server-only) : factory `S3Client` (endpoint `https://<ACCOUNT_ID>.r2.cloudflarestorage.com`),
  `createPresignedUploadUrl(key, contentType)` (PutObjectCommand + ContentType + expiresIn 600),
  `buildPublicUrl(key)`, allowlists `ALLOWED_BUCKETS` / `CONTENT_TYPE_EXT` / `isAllowedContentType`.
- `app/api/upload/route.ts` : auth Supabase → 401 ; validation bucket (400) + content-type (400) ;
  génération `uploadPath` namespacé ; retour `{uploadPath, signedUrl, publicUrl}`.
- Client : `MediaUpload.tsx` et `RetroEditor.tsx` consomment `publicUrl`. **Bug corrigé** : le PUT
  voice-note omettait le header `Content-Type` (épinglé par l'URL présignée) → 403 `SignatureDoesNotMatch` ;
  désormais `headers: { "Content-Type": contentType }`.
- `supabase/config.toml` + `docs/LOCAL_DEV.md` : setup dev local. `0002_storage_buckets.sql` supprimé
  (R2-only).
- Flux : client POST `/api/upload {bucket, contentType}` → serveur valide → mint presigned PUT + publicUrl
  → client PUT le fichier vers R2 → insère `publicUrl` dans le post / l'avatar.

## Pitfalls & Environment

- **jsdom/vitest freeze** : le sandbox ne peut pas exécuter l'environnement jsdom ni l'import jest-dom
  sans bloquer le worker. Contournement : `@vitest-environment node` + setup allégé. À valider sur la
  machine de l'humain (jsdom y marche probablement).
- **plugin-react@6 ↔ vitest vite@7** : erreur `tsc` sur `vitest.config.ts`. Contournement : exclude du
  tsconfig. À suivre.
- **403 SignatureDoesNotMatch** sur upload vocal : le header `Content-Type` du PUT doit EXACTEMENT
  correspondre à celui signé. Réglé.
- **CORS R2** : oubli = échec silencieux des uploads dans le navigateur (preflight). Ne se voit pas en
  tests unitaires (mockés).
- **Secrets** : `.env.local` gitignoré ; `.env.example` ne contient que des placeholders vides.

## Lessons for future agents

- Le projet est 100 % env-driven : local/dev/prod se bascule uniquement via `.env.local` / Vercel env,
  aucun changement de code.
- Les URLs de média doivent toujours être construites côté serveur et retournées via `publicUrl` ; ne
  jamais reconstruire côté client à partir d'une URL de provider.
- Pour tout upload direct navigateur→cloud, penser CORS + header `Content-Type` aligné sur l'URL présignée.
- Quand `tsc`/`vitest` bogue sur des fichiers de config seulement, vérifier d'abord les conflits de
  versions de plugins (plugin-react ↔ vite) avant de suspecter le code app.
- Garder les credentials R2 server-only ; le bundle client ne doit jamais contenir `R2_SECRET_ACCESS_KEY`.

## Linked reasoning / similar tasks

- `2026-08-28-invites-multiuse.md` : même pattern Auth/invites (Supabase, service_role, RLS) — utile pour
  comprendre le flux d'inscription avant de tester l'upload.
- `2026-08-28-user-creation-model.md` : modèle de création d'utilisateur (profiles/roles) en amont de l'upload.
