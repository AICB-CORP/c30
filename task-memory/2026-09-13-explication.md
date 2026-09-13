---
task_id: explication
date: 2026-09-13
type: feat
area: site/help
tags: [docs, help, retro, stealth, mobile, security, layout, navigation]
status: implemented
branch: feat/explication
related_files:
  [
    app/(site)/explication/page.tsx,
    app/(site)/explication/page.test.tsx,
    app/(site)/layout.tsx,
    task-memory/layout-test-explication-report.md,
    task-memory/2026-09-13-security-explication.md,
    task-memory/screenshot/feat-explication/explication-mobile-375.png,
    task-memory/screenshot/feat-explication/explication-desktop-1280.png,
   ]
 decisions:
   [help-page-as-nav, stealth-follow-false, softer-spoiler-copy, drop-dead-yellow-box, factual-accuracy, react-unescaped-entities, cta-button-identity, revalidate-inert]
 ---

# Feat : page « 📖 Explication » — aide rétro pour utilisateurs non techniques

## Summary

Nouvelle page `app/(site)/explication/page.tsx` qui explique, en français simple et dans l'esprit
Skyblog rétro, **comment utiliser le site** aux amis de Caroline (public non technique) : créer un
compte (code d'invitation), écrire/pubblier un post (editor TipTap, 5 polices, néon/arc-en-ciel,
marquee/blink), insérer des médias (photos+crop, vidéos, voix, GIF, embeds YouTube/Spotify), le
Blab, les coups de cœur, la vue « jour J » réservée à Caroline. Un lien de navigation « 📖 Explication »
est ajouté dans la sidebar (`app/(site)/layout.tsx`). Le contenu a été **revu pour la justesse**
(numbering 1→11, 5 polices exactes, crop Libre/1:1/4:3/16:9 + zoom/rotation, voix 🔴 Enregistrer /
⏹️ Arrêter 2 min max, flou `:hover` blur(6px)→blur(0)) pour correspondre aux composants réels.
Pipeline complet passé : checks, 243 tests, security (clean), layout (PASS @375/1280), review.

## Context / Problem

- Déclencheur : les amis invitées ne sont pas techniques ; ils ont besoin d'une page leur disant
  « qu'est-ce que je peux faire et comment ». Besoin d'un guide d'usage **rassurant, rétro, mobile-first**.
- Contraintes PROJECT_PLAN : §8 esthétique Skyblog (retro), §2 mobile-first (Caroline sur téléphone),
  §10 **stealth/anti-découverte** (Caroline ne doit rien voir avant le jour J), §4 zero-budget.
- Contrainte implicite critique : **l'aide ne doit jamais spoiler** qu'il y a une surprise pour Caroline,
  ni nommer Caroline dans des titres/meta indexables (stealth §10).

## Decision Points

### DP1 — Page d'aide = lien de navigation (pas route cachée)

- **choice** : page publique `explication/page.tsx` + bouton nav dans `(site)/layout.tsx`, visible par
  tout ami connecté.
- **rationale** : l'aide doit être **facile à trouver** par un non technicien ; la cacher serait
  contre-productif. Elle ne contient aucune info sensible.
- **alternatives** : page cachée / réservée admin → plus difficile à trouver, pas justifié.
- **tradeoff** : surface publique un peu plus grande pour un crawler — géré par stealth (voir DP2).

### DP2 — Stealth : robots.follow = false (N1, nit security)

- **choice** : `metadata.robots = { index: false, follow: false }` (au lieu de `follow: true`).
- **rationale** : §10 stealth exige `noindex` sur **toutes** les pages ; la racine a `follow: false`.
  Une page d'aide qui invite au crawl des autres pages brise le principe anti-découverte. Cohérence.
- **alternatives** : garder `follow: true` → incohérent avec la racine, petit risque de discovery.
- **tradeoff** : aucun (la page reste bien indexée-à-l'interne par la nav, juste pas par les moteurs).

### DP3 — Copy anti-spoiler plus doux (N2, nit security)

- **choice** : « c'est la surprise 🎁 » → « c'est réservé 🎁 » dans la description de la vue jour J.
- **rationale** : « surprise » révèle l'existence d'un événement caché ; « réservé » garde la
  confidentialité sans casser l'esprit.
- **alternatives** : supprimer la mention → moins utile ; « surprise » → leak.
- **tradeoff** : légèrement moins « fun » mais aligné §10.

### DP4 — Suppression du CSS mort `.retro-yellow-box` (nit layout)

- **choice** : retirer le bloc `.retro-yellow-box` ajouté à `globals.css` mais non utilisé (la page
  utilise `section.retro-box` + styles Tailwind).
- **rationale** : CSS mort = poids inutile. La suppression rend `globals.css` **identique à main**
  (vérifié `git diff main -- app/globals.css` vide) → zero risque de casser les screenshots passés.
- **alternatives** : garder le CSS (harmless) ; le brancher sur un élément → scope creep.
- **tradeoff** : aucun ; nettoyage pur.

### DP5 — Justesse factuelle (préreq pour un public non technique)

- **choice** : chaque description d'outil vérifiée contre le composant réel (RetroEditor toolbar,
  ImageCropper, VoiceRecorder, Blur CSS), 5 polices exactes (Comic Sans MS, Dancing Script,
  Courier New, Georgia, Arial), crop 4 presets + zoom/rotation, voix 2 min max.
- **rationale** : une aide inexacte nuit à la confiance et crée des tickets ; l'audience non technique
  fait tout confiance au texte.
- **alternatives** : descriptions génériques → moins fiable.
- **tradeoff** : temps de verification supplémentaire.

### DP6 — Lint react/no-unescaped-entities

- **choice** : toutes les apostrophes dans les **children JSX text** passées à `&rsquo;`
  (3 occurrences : lignes 33, 289, 323) ; les apostrophes dans des **strings** (props, body) restent
  littérales (pas linté).
- **rationale** : ESLint `react/no-unescaped-entities` bloque les `'`, `"`, `>`, `}` dans le JSX text.
- **alternatives** : désactiver la règle → non, garde la base saine.
- **tradeoff** : aucun.

### DP7 — Identité exacte du bouton CTA (reviewer, « Écrire un post »)

- **choice** : footer réécrit → « Clique sur le bouton « ✏️ Écrire un post » tout en bas à droite de
  l'écran ».
- **rationale** : le reviewer a vérifié que le vrai déclencheur est `NewPostButton.tsx` — un bouton
  `fixed bottom-4 right-4` libellé « ✏️ Écrire un post » (pas « + Nouveau post », qui n'existait
  nulle part) ; le modal interne de `RetroEditor` (titre « ✏️ Nouveau post ») n'est pas celui
  affiché. L'étiquette ET la position faussaient la dernière instruction du guide.
- **alternatives** : « + Nouveau post en haut » (ancien) → faux ; « Écrire un post » sans position →
  incomplet.
- **tradeoff** : aucun — aligné au composant réel.

### DP8 — « Enregistrer sans publier » → « Privé » (reviewer, cohérence fonction)

- **choice** : astuce réécrite → « Publie en « Privé » (section 7) : un mot restera juste entre toi
  et quelqu'un de spécial, et tu pourras le changer à tout moment ».
- **rationale** : il n'existe **pas** d'état brouillon/autosave ; « Enregistrer » n'apparaît qu'à
  l'édition d'un post existant, « Annuler » jette. Le vrai équivalent « garder pour plus tard /
  confidentiel » est le toggle **Privé** (section 7, déja décrit comme modifiable a posteriori).
- **alternatives** : ajouter un vrai draft (scope creep, hors docs) ; laisser l'assertion fausse.
- **tradeoff** : aucun — recolle la doc sur une fonction existante.
- **(N3, post-review, FIXÉ)** : la formulation intermédiaire utilisait « entre toi et Caroline » — la
  SEULE occurrence du nom dans le corps. Comme la section 7 (ligne 237) et « Jour J » (ligne 77)
  utilisent déjà le vocabulaire flouté « quelqu'un de spécial » / « la personne qui fête ses 30 ans »,
  ce nom était incohérent + un mini-leak §10. **Corrigé** en « quelqu'un de spécial » → `grep -c
  Caroline` = 0 dans la page, aligné au vocabulaire stealth de §7.

### DP9 — `export const revalidate = 0` inert (reviewer, nit Next 16)

- **choice** : retirer `revalidate = 0`, remplacer par un commentaire expliquant que le layout
  `(site)` exporte `dynamic = "force-dynamic"` et qu'il **gagne** sur toute directive d'enfants.
- **rationale** : un `force-dynamic` de layout l'emporte sur le `revalidate` d'une child ; la ligne
  était donc non-opérante et suggérait à tort un ISR. Le contenu étant 100% statique, rien à
  précharger.
- **alternatives** : la laisser (harmless) → confusant ; forcer `dynamic = "force-static"` → casserait
  le profil chargé par le layout parent.
- **tradeoff** : aucun ; lisibilité améliorée.

## Implementation approach

- **Fichiers clés :**
    - `app/(site)/explication/page.tsx` : ~330 lignes, 11 sections numérotées dans l'ordre de parcours
      (compte → post → editor/media → blab → couples de cœur → vue Caroline). `export const metadata`
      avec `robots: {index:false, follow:false}` et `<title>`/description non indexables. Rendu HTML
      **statique** via classes Tailwind + `section.retro-box` (retro). Aucune donnée serveur, aucun
      appel API.
    - `app/(site)/explication/page.test.tsx` : 3 tests (11 sections dans l'ordre, copy factuel,
      frame de rendu). Ajouté par l'agent **unit-tester** (read-only sur le src), 240→243 tests.
    - `app/(site)/layout.tsx` : +3 lignes, lien nav « 📖 Explication » dans la sidebar (visible connecté).
    - `task-memory/layout-test-explication-report.md` : rapport layout (375/1280, PASS).
    - `task-memory/screenshot/feat-explication/` : 2 screenshots (mobile 375, desktop 1280).
- **Flux** : ami connecté → clique nav « 📖 Explication » → `/explication` (force-dynamic hérité du
  groupe `(site)`) → guide statique rétro. Aucune donnée utilisateur, donc **zero impact RLS/DB**.

## Pitfalls & Environment

- **Build `npm run build` échoue sur le fetch Google Fonts** (Dancing Script / Press Start 2P) dans
  l'env **offline**. C'est **environnemental**, pas une régression code : la page compile fine
  (`tsc --noEmit` 0, lint 0 errors, 243 tests pass). En prod/Vercel (réseau), le build passe.
- **`.rg` (ripgrep) absent** env → utiliser `grep`/`find`.
- **Prettier cascade** : préférer cibler les fichiers changés
  (`npx prettier --write "app/(site)/explication/page.tsx" app/globals.css`) plutôt que `--write .`
  (retouche docs). ICI `globals.css` est revenu au state de main (identique).
- **`git diff main`** ne montrait `layout.tsx` seul d'abord car la suppression du yellow-box
  annulait la modif sur `globals.css` (jamais dans main) → diff net minimal et propre.
- **Secret pré-existant hors scope (I1, security)** : `supabase/.temp/start-secrets/
  supabase_edge_runtime_caroline/env/docker.env` est **tracké** avec des valeurs locales
  Supabase Docker (pas de secrets prod, mais mauvais pattern). Décision : **FLAGGÉ dans le PR** comme
  recommandé à corriger sur une branche séparée `fix/gitignore-secrets` (pas de scope creep dans une
  PR docs/hélp). À traiter par le humain.

## Lessons for future agents

- **Nouvelle page publique** → toujours `robots: { index: false, follow: false }` (cohérent §10 stealth
  avec la racine), jamais `follow: true`.
- **Copy « surprise »** dans un contexte d'anti-découverte → reformuler en « réservé/réserve » pour
  ne pas spoiler.
- **Aide pour non-techniques** : vérifier chaque description contre le composant réel avant de merger ;
  une aide fausse coûte un ticket.
- **JSX text** avec apostrophes → `&rsquo;` (sinon ESLint `react/no-unescaped-entities` bloque).
- **CSS ajouté mais non utilisé** = à supprimer : si le bloc n'est pas dans `main`, sa suppression rend
  le fichier identique à main (diff vide) — vérfier `git diff main` avant de supposer un changement.
- **Secret pré-existant hors scope** → ne pas le corriger dans une PR non-corrélée ; le flaggérer
  clairement dans le PR + ouvrir/planifier une `fix/…` dédiée (pas de scope creep).

## Linked reasoning / similar tasks

- task-memory/2026-09-03-editor-scrollable.md — éditeur, toolbar, mobile 375 (référence composant).
- task-memory/2026-09-03-verify-password.md & password-toggle.md — patterns gate/auth rétro (nav/copy).
- task-memory/layout-test-explication-report.md — rapport layout de cette tâche.
- task-memory/2026-08-29-r2-storage-and-local-dev.md — contexte local Dev Supabase (source de I1).
