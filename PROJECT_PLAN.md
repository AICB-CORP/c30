# Projet : Skyblog des 30 ans (anniversaire de Caroline)

> **Document de référence du projet.** À lire intégralement au début de chaque session pour comprendre le contexte sans information préalable.
> Statut : **PLAN VALIDÉ** — en attente de démarrage de l'implémentation.

---

## 1. Résumé du projet

Reconstruire un **Skyblog à l'identique de l'époque (2000-2010)** comme cadeau d'anniversaire pour les 30 ans de Caroline.

- Les **amis** de Caroline créent des comptes (pseudo rétro, email + mot de passe).
- Chaque ami publie **plusieurs posts** sur sa relation avec Caroline : textes stylés (néon, gifs, marquee, polices), photos, vidéos, messages vocaux, liens, embeds YouTube et Spotify.
- Chaque post est **public** (visible par tous les amis) ou **privé** (visible **uniquement** par Caroline).
- Le jour J, Caroline reçoit ses identifiants, se connecte avec son **compte spécial**, et découvre tout le blog.
- **Zéro budget** : 100 % technologies gratuites / open source.
- L'utilisateur du projet est un **ingénieur senior** qui écrit lui-même le front ET le back. L'assistant (opencode) doit donc fournir plans, architecture, schéma SQL et conseils — pas du code copié-collé non réfléchi.

**Principe directeur : l'authenticité prime sur le polish.** L'esthétique EST le cadeau. Curseur étoilé, `<marquee>`, texte arc-en-ciel, fonds glitter pixelisés, compteur de visites à odomètre.

---

## 2. Contexte & contraintes

- **Cadeau surprise** : Caroline ne doit JAMAIS voir le site avant le jour J (risque principal : découverte accidentelle).
- **Jour J** : publication de tous les posts au 00:01 de son anniversaire (voir §9, décision en attente).
- **Mobile-first** : Caroline lira le blog sur son téléphone. Le chaos rétro doit survivre aux petits écrans.
- **~10 à 20 amis** invités via des codes d'invitation.
- Pas d'argent dépensé (sauf peut-être un domaine ~10 € — optionnel, décision à prendre).
- Le dossier projet s'appelle `caroline` (nom de la destinataire).

---

## 3. Exigences fonctionnelles (issue de la demande initiale)

1. **Comptes amis** : email + mot de passe, signup bloqué sans code d'invitation.
2. **Posts multiples** par ami, sans limite.
3. **Choix public / privé** par post :
   - public = visible par tous les amis connectés ;
   - privé = visible uniquement par le compte de Caroline (et l'auteur).
4. **Médias** : photos, vidéos, messages vocaux (enregistrement dans le navigateur), liens.
5. **Embeds** : YouTube (coller un lien → iframe) et Spotify (coller un lien → iframe, + un sélecteur de musique façon "post Instagram" avec recherche et préviews 30 s).
6. **Personnalisation des posts** : gifs animés, animations, couleurs, changement de polices — esprit Skyblog.
7. **Esthétique** fidèle aux Skyblogs de l'époque.
8. **Jour J** : Caroline reçoit les identifiants et lit tous les posts.

---

## 4. Stack technique (100 % gratuit)

| Couche            | Choix                                                      | Justification                                                                  |
| ----------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| Frontend          | **Next.js 15+ (App Router) + TypeScript**                  | Hébergement gratuit sur Vercel                                                 |
| Styling           | **Tailwind CSS v4 + CSS custom**                           | Tailwind pour la structure, CSS main pour les effets rétro                     |
| Backend           | **Supabase** (tier gratuit)                                | Postgres + Auth + Storage + RLS unifiés                                        |
| Auth              | Supabase Auth (email/password)                             | Gratuit, inscription anonyme désactivée, gate par code d'invitation            |
| Base de données   | Supabase Postgres                                          | Schéma relationnel adapté                                                      |
| Stockage          | Supabase Storage (1 Go gratuit)                            | Photos, vidéos, vocaux                                                         |
| Éditeur riche     | **TipTap** (MIT)                                           | Extensible : couleurs, polices, text-shadow néon, marquee                      |
| Sanitisation HTML | **DOMPurify**                                              | Mode HTML brut (comme le vrai Skyblog), whitelist strict côté client + serveur |
| GIFs              | **Giphy SDK** (clé gratuite) + dossier local de gifs rétro | Sélecteur de gifs                                                              |
| Hébergement       | **Vercel Hobby** (gratuit)                                 | Déploiement natif Next.js, TLS gratuit                                         |
| Emails            | **Resend** (100/jour gratuits)                             | Invitations, notifications optionnelles                                        |
| Musique           | Spotify **oEmbed** (sans clé) + **Web API** (gratuite)     | Lien → iframe + sélecteur style Instagram                                      |
| Vidéo             | YouTube **oEmbed** (sans clé)                              | Lien → iframe                                                                  |
| Voix              | **MediaRecorder API** navigateur (aucune lib)              | Enregistrer → WebM → Storage                                                   |
| Confettis         | **canvas-confetti** (open source)                          | Effet du jour J                                                                |

**Ne PAS utiliser Firebase** : Postgres + RLS de Supabase est strictement meilleur ici (données relationnelles, règles de visibilité par ligne, stockage).

### Décisions clés

- **Domaine** : gratuit = sous-domaine `vercel.app` obscur ou `.eu.org` gratuit ; ~10 € pour un joli domaine (à trancher, cf. §9).
- **Sous-domaine / URL** : volontairement obscure (anti-découverte).

---

## 5. Schéma de base de données (Postgres / Supabase)

```sql
-- profiles : un par utilisateur auth
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text unique not null,            -- "Bella-91" style
  avatar_url text,
  bio text,
  mood text,                              -- statut façon MSN : "nostalgique 💜"
  skin jsonb default '{}',                -- personnalisation de thème par ami
  role text not null default 'friend'
    check (role in ('friend', 'birthday_girl')),
  created_at timestamptz default now()
);

-- posts : le cœur du blog
create table posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id) on delete cascade,
  title text,
  content text not null,                  -- HTML sanitise
  is_private boolean not null default false,
  mood text,
  music_embed text,                       -- iframe spotify
  scheduled_for timestamptz,              -- optionnel : sortie le jour J a 00:01
  created_at timestamptz default now()
);

-- medias attaches aux posts
create table post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references posts(id) on delete cascade,
  type text not null check (type in ('image','video','audio','gif')),
  url text not null,                      -- chemin storage ou URL externe
  position int not null default 0,
  caption text
);

-- le blab iconique (shoutbox globale)
create table blab (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references profiles(id),
  content text not null,
  created_at timestamptz default now()
);

-- coups de coeur (likes)
create table coups_de_coeur (
  post_id uuid not null references posts(id) on delete cascade,
  user_id uuid not null references profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

-- codes d'invitation (pas d'inscription libre)
create table invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,              -- "BESTIE-7F3K"
  email text,
  role text not null default 'friend',
  first_used_at timestamptz,                 -- telemetrie : 1e utilisation
  uses_count integer not null default 0,     -- nb d'inscriptions avec ce code
  max_uses integer,                          -- NULL = illimite (code partage)
  created_at timestamptz default now()
);

-- compteur de visites (odometre retro)
create table visitor_counts (
  id int primary key default 1,
  count bigint not null default 0
);
```

### RLS — le moteur de confidentialité

```sql
alter table posts enable row level security;

create policy "read posts" on posts for select
using (
  is_private = false                                -- public : tous les amis
  or auth.uid() = author_id                          -- auteur : toujours
  or exists (select 1 from profiles p
             where p.id = auth.uid()
             and p.role = 'birthday_girl')           -- Caroline : tout
);

create policy "write own posts" on posts for insert
with check (auth.uid() = author_id);
```

---

## 6. Architecture frontend (Next.js App Router)

```
app/
  (gate)/login, (gate)/inscription        # code d'invitation + email/password
  (site)/
    page.tsx                              # home : derniers posts + widgets
    posts/[id]/                           # vue d'un post
    profil/[pseudo]/                      # mini-skyblog de chaque ami
    blab/                                 # page shoutbox
    compte/                               # profil + editeur de skin
    day/                                  # LA VUE DE CAROLINE (jour J)
  api/
    oembed/                               # proxy youtube/spotify → iframe
    upload/                               # urls signees supabase storage
components/
  editor/        # TipTap retro toolbar (polices, couleurs, neon, marquee, gif picker, medias)
  widgets/       # compteur, compte a rebours, lecteur musique, classement
  post-card/     # rendu de post (HTML sanitise)
```

---

## 7. Fonctionnalités

### 7.1 Cœur (exigences initiales)

- **Comptes** : Supabase Auth, signup soumis à code d'invitation, pseudo unique.
- **Posts multiples** : illimités ; page personnelle `/profil/pseudo` (mini-skyblog).
- **Toggle public/privé** : par post → géré par RLS.
- **Photos & vidéos** : upload → Supabase Storage, compression client (`browser-image-compression`, compression vidéo) car 1 Go se remplit vite.
- **Notes vocales** : UI MediaRecorder (appuyer-pour-enregistrer), WebM, lecteur à barres.
- **Liens** : détection d'URL dans l'éditeur → linkify.
- **YouTube** : coller une URL → résolue via `api/oembed` → iframe (façon Instagram).
- **Spotify** : coller un lien → oEmbed → iframe ; + sélecteur style Instagram : recherche via Web API, préviews 30 s, puis embed.
- **Personnalisation des posts** : toolbar TipTap — polices, couleurs de texte, néon (text-shadow), marquee, clignotement, fonds colorés, picker GIF (Giphy + dossier rétro local). **Plus un mode "HTML brut"** : édition HTML comme le vrai Skyblog, sanitise DOMPurify avec whitelist (`font, marquee, blink, img, div, span, b, i, u, table, hr, center` + styles inline).

### 7.2 Ajouts proposés (à valider, cf. §9)

1. **Le Blab** — shoutbox globale. Indispensable pour l'époque.
2. **Compteur de visites odomètre** — chiffres rétro, "visites" sur la home.
3. **Compte à rebours** — "J-30 avant les 30 ans", animation flip.
4. **Coups de cœur** — like avec burst de gifs coeurs ; badge "post le plus aimé".
5. **Moods** — statuts MSN sous les pseudos.
6. **Classement des amis** — par nombre de posts (rivalité sympa).
7. **Publication programmée** — les posts sortent à 00:01 le jour J avec pluie de confettis (RECOMMANDÉ, cf. §9).
8. **"Complice depuis XXXX"** — chaque ami renseigne l'année de rencontre ; les posts affichent "complice depuis 2004".
9. **Widget best-of** — carrousel de posts aléatoires sur la home.
10. **Page de révélation** — le compte de Caroline a une vue `day/` spéciale : bienvenue, confettis (canvas-confetti), "bienvenue dans tes 30 ans", posts triés du plus ancien au plus récent comme une histoire de sa vie. Le payoff émotionnel.
11. **Lecteur musique par blog** — PAS d'autoplay (bloqué par les navigateurs), petit lecteur rétro togglable.

---

## 8. Esthétique Skyblog (critique)

- **Couleurs** : rose Skyrock classique (#FF69B4), noir, violet, bleu électrique. Néon via `text-shadow` en couches.
- **Effets CSS** : keyframes marquee, blink, texte arc-en-ciel (`background-clip: text`), fonds gif animés, curseur étincelle (CSS `cursor: url(...)`).
- **Polices** (Google Fonts) : cursive pour les titres (ex. `Dancing Script`), pixel pour les compteurs (`Press Start 2P`), fallback `Comic Sans MS` pour le cringe authentique.
- **GIFs** : dossier local de gifs d'époque (étoiles glitter, coeurs, papillons, séparateurs scintillants, barres de flammes) + recherche Giphy.
- **Mobile-first** : le chaos rétro doit tenir sur petit écran (media queries, `overflow-wrap` pour marquee).

---

## 9. Décisions en attente / à trancher

- [ ] **Moment de visibilité des posts pour Caroline** :
  - (a) visibles au fil de l'eau (mais elle ne doit JAMAIS visiter avant le jour J), OU
  - (b) tous programmés à 00:01 le jour J, révélation unique et magique — **recommandé (b)**.
- [ ] **Domaine** : vercel.app obscur / .eu.org gratuit / ~10 € joli domaine.
- [ ] **Ajouts §7.2** : tous, ou sous-ensemble ? (Le Blab et le compteur sont quasi obligatoires pour l'esprit.)
- [ ] **Nom du site** : quelque chose comme "Skyblog de Caroline" ou un pseudo-nom rétro à trouver.
- [ ] **Notifications email** aux amis quand un post est publié (Resend) — oui/non.

---

## 10. Confidentialité & anti-découverte (critique)

- `robots.txt` → disallow all ; meta `noindex` sur toutes les pages.
- Signup **gate par code d'invitation** ; aucune inscription publique.
- URL obscure ; ne jamais écrire son nom dans les titres/meta du site.
- Optionnel : le lien/identifiants remis dans une carte d'anniversaire physique plutôt qu'envoyés par texto.

---

## 11. Phases de construction

1. **Fondations** (1-2 j) : projet Supabase, auth + codes d'invitation, profiles, RLS.
2. **Cœur blog** (2-3 j) : CRUD posts, éditeur TipTap avec toolbar rétro, rendu sanitise, feed home.
3. **Médias** (2 j) : uploads, enregistreur vocal, proxy oEmbed (YouTube/Spotify), picker GIF.
4. **Widgets** (1 j) : compteur, compte à rebours, blab, coups de cœur, classement.
5. **Personnalisation** (1-2 j) : skins, polices, néon, mode HTML.
6. **Révélation Caroline** (1 j) : confettis, vue day/, tri chronologique.
7. **Répétition générale** (1 j) : comptes factices, posts de test, vérif mobile, validation RLS (privé/public/vue Caroline).

Total : **~1 à 2 semaines de soirées**, coût 0 €.

---

## 12. Pièges de coût à éviter

- **Storage Supabase 1 Go** : la vidéo est le tueur — compresser côté client (viser 2-5 Mo par clip). Alternative Cloudflare R2 (10 Go gratuits, egress gratuit) si les amis abusent des vidéos.
- **Fonctions Vercel** : garder le proxy oEmbed minimal ; fetch côté client quand possible.
- **Email** : 100/jour Resend largement suffisant pour ~15 invitations.

---

## 13. Rappels de session (checklist pour ouvrir une session)

1. Lire ce document en entier.
2. Se référer au §4 (stack), §5 (schéma SQL), §6 (structure) pour tout code.
3. Respecter les décisions du §9 (reprendre les éléments en attente au besoin).
4. Ne pas proposer de stack payante sans justification explicite (contrainte budget zéro).
5. Toujours garder en tête : surprise pour Caroline, mobile-first, esthétique rétro authentique.
6. Se souvenir : l'utilisateur est senior — expliquer les choix, fournir plans/schémas/astuces, pas de code prémâché sauf demande explicite.

---

## 14. État d'implémentation (mise à jour du 13/08/2026)

**Le projet est codé et compile** (`npm run build` OK, `npm run lint` OK — 0 erreurs). Structure Next.js 16 (App Router) + TypeScript + Tailwind v4 + Supabase.

### 14.1 Décisions d'implémentation

1. **Médias intégrés inline dans le HTML du contenu** (`posts.content`) — la table `post_media` existe dans le schéma mais n'est pas utilisée par l'éditeur. Simplification assumée.
2. **Buckets storage publics en lecture** (`avatars`, `post-media`) : chemins = `{uid}/{uuid}.{ext}` non devinables ; le site est invite-only + noindex → compromis accepté.
3. **Sanitisation étendue** par rapport au plan : `video`, `audio` autorisés (src/controls), `iframe` autorisé UNIQUEMENT pour hosts youtube.com / spotify.com (vérif dans `lib/sanitize.ts`). `lib/sanitize.ts` = couche de sécurité obligatoire à TOUT rendu de contenu utilisateur.
4. **Publication programmée** : filtre `scheduled_for is null or <= now()` côté requêtes — les posts apparaissent à 00:01 le jour J. Option (b) du §9 retenue par défaut.
5. **Date d'anniversaire** configurable via `NEXT_PUBLIC_BIRTHDAY_DATE` (défaut : 31/12/2026) — à régler AVANT le déploiement.
6. **Next.js 16** : `middleware.ts` → **`proxy.ts`** (renommé), `params`/`searchParams` async, pages (site) en `force-dynamic`.
7. **Avatars** uploadés dans le bucket `post-media` (contrat `MediaUpload` sans bucket) — cosmétique, fonctionnel.
8. **Compteur de visites** : incrément non atomique via service role (odomètre de visite, sans importance).
9. **Widgets rétro** (Countdown, HitCounter, CoupDeCoeur, FriendRanking, BestOfPost) implémentés par l'orchestrateur (agent designer indisponible en session).

### 14.2 Fichiers clés

```
app/(gate)/login, inscription        # auth + code d'invitation
app/(site)/page.tsx                  # home : posts + sidebar (countdown, hitcounter, ranking, best-of)
app/(site)/posts/[id]                # vue post
app/(site)/profil/[pseudo]           # mini-skyblog par ami
app/(site)/blab/                     # shoutbox + realtime
app/(site)/compte/                   # bio, mood, avatar
app/(site)/day/                      # révélation Caroline (confettis, tri chronologique)
app/api/oembed|upload|counter|auth/signup
components/editor/RetroEditor.tsx    # éditeur TipTap + mode HTML brut
components/post/PostCard.tsx         # rendu sanitizé + coups de cœur
components/media/*                   # GifPicker, VoiceRecorder, MediaUpload
components/widgets/*                 # rétro widgets
lib/sanitize.ts                      # DOMPurify whitelist
lib/supabase/{client,server}.ts      # clients SSR
proxy.ts                             # garde d'auth (Next 16)
supabase/migrations/0001_init.sql    # schéma + RLS
supabase/migrations/0002_storage_buckets.sql
```

### 14.3 Mise en route (avant tout test)

> **Stockage = Cloudflare R2** (plus Supabase Storage). Voir `docs/LOCAL_DEV.md` pour le setup complet
> (dev local avec Supabase local + R2 cloud, puis Vercel en prod).

1. **Supabase** : créer un projet (gratuit) sur https://supabase.com **ou** lancer un Supabase local
   (`supabase start`, nécessite Docker — voir `docs/LOCAL_DEV.md`).
2. Appliquer **`supabase/migrations/0001_init.sql`** (SQL Editor ou `supabase db reset`).
   La migration `0002_storage_buckets.sql` a été **supprimée** : le stockage est sur R2, pas Supabase.
3. Auth → activer Email/Password, désactiver les inscriptions anonymes.
4. Remplir `.env.local` : `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_BIRTHDAY_DATE`, `NEXT_PUBLIC_GIPHY_KEY` (option),
   **et les 5 vars R2** : `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET_NAME`, `R2_PUBLIC_URL` ( voir `.env.example`).
5. **R2** : créer le bucket, activer l'accès public (URL `https://pub-<hash>.r2.dev`), créer un token
   API **scopé au bucket en écriture seule**, et configurer le **CORS** pour autoriser `PUT`/`OPTIONS`
   depuis l'origine (en dev : `http://localhost:3000`).
6. Créer les codes d'invitation : `insert into invites (code, email, role) values ('BESTIE-XXXX', 'ami@mail.fr', 'friend'), ('PRINCESSE-1', null, 'birthday_girl');`
7. `npm run dev` → tester le parcours inscription (code invité) → post (upload R2) → blab → compteur.
8. Répétition générale (voir skill birthday-reveal) avec comptes factices.
9. Déploiement prod : Vercel, avec les mêmes vars Supabase (hébergé) + R2 côté serveur (jamais `NEXT_PUBLIC_`).

### 14.4 Sécurité (audit fait — tout pass)

- Sanitisation : whitelist + hook afterSanitizeAttributes (styles filtrées, href http/https/mailto, iframe youtube/spotify uniquement, rel noopener forcé)
- oEmbed : hosts autorisés + re-validation de l'iframe + timeout 5 s
- Upload : auth requise + allowlist types/buckets + dossier par utilisateur + upsert:false
- Signup : code d'invitation réutilisable (multi-use) vérifié côté serveur (service role) ; blobcage optionnelle via `max_uses` (NULL = illimité, un seul code partagé par tous les amis). `uses_count` incrémenté à chaque inscription, `first_used_at` en télémétrie.
- Stealth : robots.ts disallow /, metadata noindex, aucun nom dans les métadonnées
- Points restants (mineurs, documentés) : pas de CSP/rate-limiting ; avatars dans bucket post-media ; visitor_counts non atomique

---

## 15. Workflow GitHub obligatoire (défini dans les agents)

**TOUTE tâche future passe par le pipeline du project-manager (`.opencode/agent/project-manager.md`) — aucune exception :**

1. Pré-check git (repo propre, `main` à jour)
2. Branche depuis `main` : `feat/<slug>` | `fix/<slug>` | `bug/<slug>`
3. Implémentation déléguée aux agents spécialisés (database, frontend, security, designer, media, deployment)
4. Tests unitaires via l'agent **unit-tester** (Vitest + Testing Library, stack déjà configurée)
5. Checks obligatoires : `prettier --write .` → `npm run lint` → `npx tsc --noEmit` → `npm test` → `npm run build`
6. Revue par l'agent reviewer (read-only), corrections si blocking
7. Commit (Conventional Commits, type = préfixe branche) → `git push -u origin <branche>`
8. PR via `gh pr create` avec un **rapport markdown complet** : contexte, décisions de design (et pourquoi), agents appelés (tableau), implémentation, tests, vérifications, points d'attention pour le reviewer humain
9. **L'agent ne merge JAMAIS** — le reviewer humain fusionne la PR

Outils installés : `vitest`, `jsdom`, `@testing-library/react|jest-dom|user-event`, `@vitejs/plugin-react`, `prettier`. Scripts : `npm test`, `npm run test:watch`, `npm run format`.

**Prérequis côté humain :** repo git initialisé avec branche `main` poussée sur GitHub, `gh` CLI authentifié (token fourni par l'utilisateur), `git` configuré. Voir `docs/GITHUB-HYBRID.md` pour le déclenchement automatique via issues GitHub.
