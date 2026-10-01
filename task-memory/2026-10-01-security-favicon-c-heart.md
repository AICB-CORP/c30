---
task_id: security-favicon-c-heart
date: 2026-10-01
type: docs
area: branding/favicon
tags: [security, favicon, svg, stealth, supply-chain]
status: implemented
branch: feat/favicon-c-heart
related_files:
  - app/icon.svg
  - app/favicon.ico
  - app/apple-icon.png
  - app/layout.tsx
  - scripts/generate-favicon.mjs
  - scripts/lib/favicon-ico.mjs
decisions: []
---

# Rapport sécurité — feat/favicon-c-heart (pré-merge)

> Généré par l'agent security (read-only) le 2026-10-01, persisté par l'orchestrateur.
> Verdict : **merge-ready — 0 blocking, 0 important, 4 nits.**

## Audits (tous pass)

- **(a) Sanitizer (DOMPurify)** — CLEAN. `lib/sanitize.ts` et tout composant de rendu HTML intacts
  (`git diff main -- lib/ components/` vide). Les 3 assets d'icône sont statiques (build-time),
  servis via les conventions metadata de Next — jamais du contenu utilisateur, jamais routés par le
  sanitizer. `app/icon.svg` audité ligne par ligne : pas de `<script>`, pas de `xlink:href`, pas de
  `<use>`, pas de `foreignObject`, pas de CSS `url()`, pas de handlers d'événements.
- **(b) RLS** — CLEAN. Aucun fichier touchant la DB modifié (`git diff main --name-only -- lib/
supabase/ app/api/ components/` vide) ; matrice de visibilité bit-identique à main ; `proxy.ts`
  intact.
- **(c) Secrets/gitignore** — CLEAN. Scan full-diff (JWT, clés privées, sk_live/pk_live, AKIA,
  sb_secret, ghp_, xoxb, R2_SECRET, passwords) → 0 match. `package.json` : une seule ligne ajoutée
  (`"sharp": "^0.35.5"`). `.env.local` non tracké. Supply chain : MIT, gratuit, déjà présent sur main
  comme optionalDependency de next (0.35.3 → 0.35.5, bump mineur registry officiel, integrity-pinned) ;
  `npm audit --json` → 0 advisory sur sharp/@img.
- **(d) Stealth/CDN** — CLEAN. Favicon 100 % auto-hébergée (0 URL externe, 0 CDN, 0 script
  third-party introduits). Posture préservée : robots.ts disallow all, metadata noindex
  (index/follow false, nocache), theme-color = couleur de chrome uniquement, jamais d'indexation.
  Aucun nom dans les assets (`grep caroline|princesse|birthday` → 0). `apple-icon.png` sans chunks
  tEXt/iTXt/zTXt (chunk-walk vérifié).
- **(e) Dev scripts** — CLEAN. Chemins constants relatifs (pas de traversal), écritures limitées aux
  2 paths `app/`, pas de child_process/eval ; dev-only, jamais importé dans app code ; builder pur
  couvert par 15/15 tests.
- **(f) I-1 précédent** — RESOLVED. `.gitignore` couvre `INVITATION_CAROLINE_30.md` (exit 0) ; le
  fichier n'a jamais entra git history.

## Nits (à logger pour un futur PR de cleanup)

- **N-1** — ordre d'écriture dans `generate-favicon.mjs` (apple-icon avant buildIco) — **CORRIGÉ dans
  cette PR** (les deux buffers sont construits avant toute écriture).
- **N-2** — pas de script npm pour la régénération — **CORRIGÉ dans cette PR** (`npm run favicon`).
- **N-3** — `<Analytics />` (@vercel/analytics/next) dans layout.tsx est préexistant sur main ;
  §10 ne liste pas d'analytics — first-party (dashboard équipe only, zéro exposition publique),
  à confirmer ou retirer dans un futur PR de cleanup.
- **N-4** — `npm audit` full tree : 41 vulnérabilités préexistantes (1 critical, 3 high — next
  16.3.0, tiptap, js-yaml, giphy uuid) ; aucune introduite ici ; `npm audit fix` pour un futur PR
  de maintenance — surveiller un patch Next.
