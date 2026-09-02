# Task Memory — base de raisonnement des tâches

Ce dossier conserve, pour chaque tâche du projet, une capture structurée du **raisonnement**
(contexte, décisions, pièges, leçons). Objectif : alimenter un outil futur (« graphify ») qui lit
ces markdown **avant** de démarrer une tâche similaire, pour que l'agent réutilise la réflexion
passée au lieu de la réinventer.

## Format

Chaque tâche = un fichier `YYYY-MM-DD-<slug>.md` avec :

- un **front-matter YAML** (parsable automatiquement) en tête ;
- un corps markdown lisible.

### Schéma du front-matter

| clé             | type     | description                                     |
| --------------- | -------- | ----------------------------------------------- |
| `task_id`       | string   | slug de la tâche                                |
| `date`          | string   | `YYYY-MM-DD`                                    |
| `type`          | enum     | `feat` \| `fix` \| `bug` \| `docs` \| `chore`   |
| `area`          | string   | domaine (ex. `auth/invites`, `editor`, `media`) |
| `tags`          | string[] | mots-clés pour le graphe                        |
| `status`        | enum     | `implemented` \| `review` \| `blocked`          |
| `branch`        | string   | branche git associée                            |
| `related_files` | string[] | fichiers touchés                                |
| `decisions`     | string[] | identifiants des décisions (liens internes)     |

### Sections du corps (ordre recommandé)

1. **Summary** — quoi + pourquoi (1 paragraphe).
2. **Context / Problem** — déclencheur + contraintes (référencer `PROJECT_PLAN.md` §…).
3. **Decision Points** — pour chaque choix non trivial : `choice`, `rationale`, `alternatives`, `tradeoff`. _Section la plus utile pour le graphe._
4. **Implementation approach** — fichiers clés, flux de données.
5. **Pitfalls & Environment** — ce qui a cassé / surpris (toolchain, scopes de token, RLS…).
6. **Lessons for future agents** — règles réutilisables.
7. **Linked reasoning / similar tasks** — références vers d'autres fichiers `task-memory/`.

## Index des tâches

| Date                 | task_id                    | area               | status      | fichier                                                                                |
| -------------------- | -------------------------- | ------------------ | ----------- | -------------------------------------------------------------------------------------- |
| 2026-08-28           | invites-multiuse           | auth/invites       | implemented | [2026-08-28-invites-multiuse.md](./2026-08-28-invites-multiuse.md)                     |
| 2026-08-28           | user-creation-model        | auth/invites       | reference   | [2026-08-28-user-creation-model.md](./2026-08-28-user-creation-model.md)               |
| 2026-08-29           | r2-storage-and-local-dev   | storage/r2 + infra | review      | [2026-08-29-r2-storage-and-local-dev.md](./2026-08-29-r2-storage-and-local-dev.md)     |
| 2026-08-30           | supabase-key-format-change | infra/supabase     | implemented | [2026-08-30-supabase-key-format-change.md](./2026-08-30-supabase-key-format-change.md) |
| 2026-08-30           | posts-query-ambiguity-fix  | query/rls          | implemented | [2026-08-30-posts-query-ambiguity-fix.md](./2026-08-30-posts-query-ambiguity-fix.md)   |
| 2026-09-01           | image-cropper-compression  | media/editor       | implemented | [2026-09-01-image-cropper-compression.md](./2026-09-01-image-cropper-compression.md)   |
| 2026-09-02           | video-audio-upload-fix     | media/upload       | implemented | [2026-09-02-video-audio-upload-fix.md](./2026-09-02-video-audio-upload-fix.md)         |
| 2026-09-02           | carousel-multi-upload      | media/carousel     | implemented | [2026-09-02-carousel-multi-upload.md](./2026-09-02-carousel-multi-upload.md)           |
| 2026-09-03           | editor-scrollable          | editor/layout      | implemented | [2026-09-03-editor-scrollable.md](./2026-09-03-editor-scrollable.md)                   |
| // screenshot update |
