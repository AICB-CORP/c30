# Security Review — feat/explication — 2026-09-13

## Scope
Audit de la branche `feat/explication` (page d'aide « 📖 Explication ») contre
`PROJECT_PLAN.md` §5 (RLS) et §10 (stealth/privacy). Fichiers audités via
`git diff main --name-only` + untracked :
- `app/(site)/explication/page.tsx` (nouveau)
- `app/(site)/explication/page.test.tsx` (nouveau)
- `app/(site)/layout.tsx` (lien nav)
- `task-memory/2026-09-13-explication.md`, `layout-test-explication-report.md`, screenshots

## Verdict : CLEAN (2 nits en scope corrigés, 1 finding pré-existant hors scope)

## §10 Stealth / anti-découverte
- **N1 (nit, FIXÉ)** — `metadata.robots` était `{ index:false, follow:true }` → incohérent avec la
  racine (`follow:false`). Risque d'inviter au crawl des autres pages brise §10. **Corrigé** :
  `{ index:false, follow:false }` (page.tsx:9).
- **N2 (nit, FIXÉ)** — copy « c'est la surprise 🎁 » révélait l'existence d'un événement caché →
  **corrigé** en « c'est réservé 🎁 » (page.tsx:73), aligné §10 sans casser l'esprit.
- **Title/description** « Page d'aide — comment écrire un post » : aucun nom de Caroline, aucun leak
   §10. `noindex` présent → pas d'indexation. OK.
- **N3 (IMPORTANT, FIXÉ post-review)** — l'astuce « Privé » contenait « entre toi et Caroline »
   (page.tsx:275), la SEULE occurrence du nom dans le corps. Section 7 (ligne 237) et « Jour J »
   (ligne 77) utilisent déjà un vocabulaire flouté (« quelqu'un de spécial », « la personne qui fête
   ses 30 ans ») — donc incohérent + un leak d'identité. **Corrigé** en « juste entre toi et
   quelqu'un de spécial » → zéro occurrence de « Caroline » dans la page (vérif `grep -c Caroline` = 0),
   aligné au vocabulaire stealth de §7. Note : même si le §10 visait surtout les titles/meta, la page
   est `noindex`+`follow:false`+invite-only → aucune surface indexable de toutes façons, mais la
   cohérence du vocabulaire renforce l'anti-spoiler.
- `dangerouslySetInnerHTML` : **absent** de la page (contenu 100% statique, classes Tailwind +
  `section.retro-box`). Pas de surface XSS. OK.

## §5 RLS / données — NON APPLICABLE
La page ne touche **aucune** requête DB, aucun hook data, aucun fetch serveur/API. Rendu statique
hérité du groupe `(site)` (`force-dynamic`). **Zero impact RLS.** Aucune régression possible.

## Secrets / gitignore
- **I1 (IMPORTANT, PRÉ-EXISTANT, HORS SCOPE)** — `supabase/.temp/start-secrets/
  supabase_edge_runtime_caroline/env/docker.env` est **tracké** dans le repo avec des valeurs
  Supabase Docker **locales** (pas de secrets prod : pas d'anon key hébergée, pas de service role).
  Pas un leak critique, mais mauvais pattern (fichiers `.temp` d'un supabase docker doivent être
  ignorés). **Décision** : ne PAS corriger dans cette PR docs/help (pas de scope creep) → **FLAGGÉ**
  dans le PR comme recommandé à traiter sur branche dédiée `fix/gitignore-secrets`. Origine probable :
  `task-memory/2026-08-29-r2-storage-and-local-dev.md`.

## Autres
- **iFrames/3rd-party** : aucun iframe/URL tierce sur la page (stealth OK, §12 coûts OK).
- **rel/target** : aucun lien `<a>` sortant dans la page (contenu textuel) → pas de `noopener` requis.
- **Tests** : aucun test écrit par le security agent (read-only). Tests page par l'agent unit-tester.

## Findings catégorisés
| # | Sévérité | Statut | Détail |
| - | -------- | ------ | ------ |
| N1 | nit | FIXÉ | robots.follow → false |
| N2 | nit | FIXÉ | copy spoiler → « réservé » |
| I1 | important | À traiter (hors scope) | tracked secrets local `supabase/.temp/.../docker.env` → `fix/gitignore-secrets` |

**Résidus** : I1 recommandé au humain, pas bloquant pour le merge de `feat/explication`.
