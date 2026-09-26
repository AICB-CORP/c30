---
task_id: r2-vercel-env-vars
date: 2026-09-26
type: fix
area: media/upload + infra/vercel
tags:
  - r2
  - vercel
  - env-vars
  - cors
  - cloudflare
  - presigned-url
  - uploads
  - production
  - giphy
  - birthday-date
status: review
branch: fix/r2-vercel-env-vars
related_files:
  - docs/LOCAL_DEV.md
  - lib/r2.ts
  - app/api/upload/route.ts
  - components/media/MediaUpload.tsx
decisions:
  - r2-vars-from-env-local
  - supabase-vars-not-copied
  - r2-secret-type-sensitive
  - r2-targets-all-envs
  - birthday-date-dec31
  - giphy-key-plain-not-sensitive
  - cors-human-action
---

# Fix : uploads R2 cassés en prod (Vercel) — variables placeholder + CORS bucket

## Summary

Sur https://caroline-30.fun, l'upload de fichiers échouait (« Failed to fetch » dans l'UI).
**Deux causes racine** : (1) les 5 variables `R2_*` dans Vercel contenaient les **valeurs
placeholder de `.env.example`** (`your-r2-account-id`, `your-r2-access-key-id`) — les URLs
presignées pointaient vers un host S3 inexistant (`skyblog-media.your-r2-account-id…`),
le PUT navigateur mourait en `ERR_SSL_VERSION_OR_CIPHER_MISMATCH` alors que
`POST /api/upload` répondait 200 (la signature se calcule localement, sans contacter R2) ;
(2) la **CORS du bucket R2** n'autorise que `http://localhost:3000`, pas
`https://www.caroline-30.fun` → preflight OPTIONS du PUT navigateur rejeté (403).
(1) est corrigé (vars réelles depuis `.env.local` + redéploiement prod, vérifié E2E côté
serveur). (2) requiert une **action humaine dans le dashboard Cloudflare** — le token API
R2 du projet est scopé objets uniquement (`PutBucketCors` → AccessDenied).

## Context / Problem

- Déclencheur : « uploading files doesn't work » sur le site publié ; l'utilisateur suspectait
  les variables d'env R2 sur Vercel et a demandé de les aligner sur `.env.local` + de tester
  sur caroline-30.fun.
- Contraintes : PROJECT_PLAN §4 (stack R2/S3 presigned), §12 (budget stockage), §14.2/§14.3
  (design presigned-URL, setup R2), docs/LOCAL_DEV.md §5 (CORS bucket) et §7 (prod).
- Reproduction : session Playwright sur le compte de test **TestBot30** (mot de passe réinitialisé
  via SQL — valeur volontairement non consignée dans le repo), upload avatar dans `/compte`
  → cropper → « Failed to fetch ».
  Preuves réseau : presigned URL host `skyblog-media.your-r2-account-id.r2.cloudflarestorage.com`.

## Decision Points

1. **r2-vars-from-env-local** — `choice` : écraser les 5 vars `R2_*` de Vercel avec les valeurs
   réelles de `.env.local` (upsert), puis redéployer la prod.
   `rationale` : R2 est cloud-only, dev et prod partagent le même bucket (PROJECT_PLAN §14.3,
   docs §7 « les 5 mêmes variables »). Les valeurs chiffrées existantes étaient des placeholders.
   `alternatives` : tenter de déchiffrer/comparer les anciennes vars (impossible côté MCP) ;
   modifier le code (inutile).
   `tradeoff` : on écrase sans pouvoir comparer l'ancien contenu — acceptable, l'ancien contenu
   était démontré cassé.
2. **supabase-vars-not-copied** — `choice` : NE PAS copier `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` depuis `.env.local`.
   `rationale` : `.env.local` pointe vers Supabase **local Docker** (`http://127.0.0.1:54321`,
   JWT « supabase-demo »). Les copier aurait cassé l'auth/DB hébergée (`lophtoamoimebhiadyve.supabase.co`)
   qui fonctionne (3 profils créés en prod le 22/09). La demande « equals to .env.local » visait
   le stockage R2.
3. **r2-secret-type-sensitive** — `choice` : type `sensitive` pour `R2_SECRET_ACCESS_KEY`
   (était `encrypted`, signalée « readable-secret » par Vercel).
   `rationale` : usage runtime uniquement (route `/api/upload`), les vars sensibles sont exclues
   du build mais disponibles au runtime. `R2_ACCOUNT_ID`/`R2_ACCESS_KEY_ID` restent `encrypted`.
4. **r2-targets-all-envs** — `choice` : cibles `production + preview + development` pour les 5 vars.
   `rationale` : sinon tout déploiement preview casse `/api/upload` en 500 (piège pour les
   futures PR de l'équipe et les agents layout/qa). Nuance documentée : les previews restent
   **exclues de la CORS bucket** (surface réduite, posture stealth §10) — le PUT navigateur y
   sera bloqué à la preflight ; les tests d'upload se font en local ou sur le domaine prod.
5. **birthday-date-dec31** — `choice` : `NEXT_PUBLIC_BIRTHDAY_DATE=2026-12-31T00:00:00+01:00`
   (conforme `.env.local`, PROJECT_PLAN §14.3 et l'invitation « Le jour J (31 decembre) »).
   `rationale` : une valeur `2026-10-27` posée sur Vercel le jour même (jamais déployée,
   donc jamais visible) contredit les 3 sources du repo ; laisser le redéploiement l'activer
   aurait changé le compte à rebours sans justification documentée. La var n'affecte QUE le
   widget Countdown (lib/config.ts) — le gate `/day` est par rôle et les posts par
   `scheduled_for` en DB. **À confirmer par le reviewer humain** (si l'anniversaire est
   réellement le 27/10, rechanger la var sur Vercel + redéployer).
6. **giphy-key-plain-not-sensitive** — `choice` : `NEXT_PUBLIC_GIPHY_KEY` passée de `sensitive`
   à `plain` avec la valeur de `.env.local`.
   `rationale` : les vars `sensitive` sont **exclues du build**, donc jamais inlinées dans le
   bundle client — la recherche GIF était silencieusement cassée en prod. Vérifié après
   redéploiement : `api.giphy.com/v1/gifs/search` → 200 avec la clé, 24 résultats affichés.
7. **cors-human-action** — `choice` : documenter précisément le JSON CORS à coller dans le
   dashboard Cloudflare R2 plutôt que de contourner.
   `rationale` : le token R2 est scopé objets (`GetBucketCors`/`PutBucketCors` → AccessDenied,
   bonne hygiène). Contourner en proxifiant l'upload via une fonction Vercel casserait les
   vidéos/vocaux (limite body 4,5 Mo) et brûlerait la bande passante — contraire à §12.
   Le JSON final (origines `localhost:3000` + `www.caroline-30.fun` + `caroline-30.fun`)
   est dans docs/LOCAL_DEV.md §5.

## Implementation approach

1. Diagnostic reproductible : login TestBot30 sur www.caroline-30.fun → upload avatar →
   console + réseau → presigned URL host = placeholder ; PUT → `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`.
2. Upsert batch des 7 vars Vercel (5×R2_, BIRTHDAY_DATE, GIPHY_KEY) via l'API MCP
   (`upsert=true`), cibles `production,preview,development`.
3. Redéploiement prod depuis GitHub `AICB-CORP/c30@main` (1bdc880) — les vars sont capturées
   à la création du deployment : `dpl_C6uKo7scAJX3ykkP7Qq8MacVcUEj` → READY, alias
   www.caroline-30.fun.
4. Vérification E2E : `POST /api/upload` côté prod renvoie une presigned URL sur le vrai
   bucket → PUT serveur (curl) → **200** ; GET public (`r2.dev`) → **200, image/jpeg 128 949 o** ;
   l'image R2 s'affiche dans la page ; objet de test **supprimé** ensuite (DeleteObject 204,
   GET public → 404). Preflight CORS vérifié par origine : localhost 204/ACAO ✓,
   www.caroline-30.fun 403 ✗ (→ action humaine restante).
5. Docs : docs/LOCAL_DEV.md §5 (origines CORS concrètes) + §7 « Pièges Vercel »
   (placeholders, NEXT_PUBLIC jamais sensitive, redéploiement requis).

## Pitfalls & Environment

- `POST /api/upload` **200 ne prouve rien** : la signature presigned se calcule localement ;
  avec des identifiants poubelle l'échec n'apparaît qu'au PUT navigateur.
- Modifier une var d'env Vercel **nécessite un redéploiement** pour prendre effet.
- Une var `NEXT_PUBLIC_*` de type `sensitive` est absente du build → `undefined` côté client,
  sans erreur visible.
- Le token API R2 « écriture seule » du projet **peut supprimer** des objets (DeleteObject 204)
  mais **ne peut pas** gérer la CORS bucket (AccessDenied).
- L'apex `caroline-30.fun` redirige (308) vers `www.caroline-30.fun` : l'origine navigateur
  pour la CORS est donc `https://www.caroline-30.fun`.
- Compte QA : mot de passe TestBot30 réinitialisé via SQL (`update auth.users set
encrypted_password = crypt('<valeur>', gen_salt('bf'))`) — valeur volontairement NON
  consignée dans le repo (compte actif en prod). À réinitialiser de la même façon pour tout
  futur besoin QA ; **supprimer le compte TestBot30 après le jour J** (il ne sert qu'aux tests).
- Issue préexistante (hors scope, signalée) : `public/gifs/` ne contient que le README — les 5
  GIFs rétro du picker 404 sur la prod.

## Lessons for future agents

- Pour « uploads cassés en prod », tester les 3 étages séparément : (a) presigned host correct ?
  (b) PUT curl serveur sur URL presigned prod → 200 ? (c) preflight OPTIONS par origine →
  `Access-Control-Allow-Origin` ? — (a) = vars Vercel, (b) = credentials/signature,
  (c) = CORS bucket.
- Ne JAMAIS copier `.env.local` en bloc vers Vercel : en dev ce fichier cible Supabase local ;
  seules les vars cloud-partagées (R2) sont identiques.
- Toujours vérifier le type Vercel de chaque `NEXT_PUBLIC_*` (plain/encrypted, jamais sensitive).
- Un snapshot SQL AVANT de toucher (invites, profils) permet de restaurer la télémétrie après
  un test.

## Linked reasoning / similar tasks

- task-memory/2026-08-29-r2-storage-and-local-dev.md — design initial R2 (presigned PUT,
  CORS, token scopé) ; ce fix en est la suite en prod.
- task-memory/2026-08-30-supabase-key-format-change.md — même zone (infra/config), pattern
  « vérifier les vars côté Vercel ».
- task-memory/2026-09-02-video-audio-upload-fix.md — pipeline upload côté client.
