# Local development — Dev local (Supabase CLI + Docker)

Ce guide explique comment lancer le projet en **local** avec un Supabase auto-hébergé
via la Supabase CLI + Docker. La prod utilisera plus tard Vercel + un Supabase hébergé,
mais le stockage **R2 reste dans le cloud dans les deux cas**.

This guide covers local dev only: a locally-run Supabase (CLI + Docker) while
**Cloudflare R2 stays in the cloud** for both local and production.

---

## 1. Prérequis / Prerequisites

- **Docker** installé et démarré (Supabase local tourne dans des containers).
- **Node 18+** et les deps du projet (`npm install` déjà fait).
- **Supabase CLI** :

  ```bash
  # macOS (Homebrew)
  brew install supabase/tap/supabase

  # ou / or (sans brew) — devDependency
  npm i -D supabase
  ```

  Vérifiez / verify : `supabase --version`.

---

## 2. Démarrer Supabase en local / Start local Supabase

Le dossier `supabase/migrations/` existe déjà (ne faites pas `supabase init` si vous
avez déjà le dossier `supabase/` — ici `supabase/config.toml` et les migrations sont
déjà présents).

The `supabase/` folder (config + migrations) is already in the repo, so skip `supabase init`.

```bash
supabase start
```

La CLI démarre Docker et affiche (entre autres) / prints:

- **API URL** : `http://127.0.0.1:54321`
- **anon key** et **service_role key** (à copier dans `.env.local`)
- **Studio** : `http://127.0.0.1:54323` (interface d'admin DB / auth)
- **Inbucket** : `http://127.0.0.1:54324` (boîte mail locale pour tester les emails)

> Note : `supabase/config.toml` définit `enable_confirmations = false` pour le dev,
> donc les inscriptions locales ne nécessitent **pas** de confirmation par email.
> / Dev convenience: local signups don't require email confirmation.

---

## 3. Appliquer les migrations / Apply migrations

```bash
supabase db reset
```

Cette commande recrée la base et applique les migrations dans `supabase/migrations/`
par ordre de nom : `0001_init.sql` (schéma + RLS), puis `0003_invites_multiuse.sql`.

> ⚠️ Le fichier `0002_storage_buckets.sql` a été **supprimé** : le stockage n'est plus
> Supabase Storage mais **Cloudflare R2**. / The storage migration was removed because
> we now use Cloudflare R2, not Supabase Storage.

Si vous voulez juste rejouer les migrations sans reset : `supabase migration up`.

---

## 4. Fichier `.env.local` (valeurs LOCALES Supabase + R2 cloud)

Copiez `.env.example` → `.env.local` et renseignez (exemple) / copy and fill:

```
# Local Supabase (from `supabase start`)
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=<local anon key>
SUPABASE_SERVICE_ROLE_KEY=<local service_role key>

# Cloudflare R2 (cloud — same values you'll use in prod)
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=skyblog-media
R2_PUBLIC_URL=https://pub-<hash>.r2.dev

NEXT_PUBLIC_GIPHY_KEY=
NEXT_PUBLIC_BIRTHDAY_DATE=2026-12-31T00:00:00+01:00
```

- Récupérez `NEXT_PUBLIC_SUPABASE_ANON_KEY` et `SUPABASE_SERVICE_ROLE_KEY` depuis la
  sortie de `supabase start` (ou Studio → Project Settings → API).
- Les 5 variables `R2_*` pointent vers le **même bucket cloud** que la prod. R2 reste
  dans le cloud même en dev local. / R2 stays cloud even in local dev.
- Optionnel : utilisez un bucket séparé `skyblog-media-dev` pour isoler les fichiers
  de test. / Optionally use a separate `skyblog-media-dev` bucket for test data.

---

## 5. CORS du bucket R2 (IMPORTANT)

Le navigateur fait un **PUT direct vers R2** (upload côté client), donc le bucket R2
doit autoriser `PUT`/`OPTIONS` depuis `http://localhost:3000` (et plus tard l'origine
Vercel). Configurez la **CORS policy** du bucket dans le dashboard Cloudflare R2
(ou via `wrangler`) avec ce JSON :

```json
[
  {
    "AllowedOrigins": [
      "http://localhost:3000",
      "https://www.caroline-30.fun",
      "https://caroline-30.fun"
    ],
    "AllowedMethods": ["PUT", "OPTIONS", "GET", "POST"],
    "AllowedHeaders": ["Content-Type"],
    "ExposeHeaders": ["ETag"],
    "MaxAgeSeconds": 3000
  }
]
```

> Sans cette règle, les uploads échoueront en `OPTIONS` (preflight) ou en `PUT`.
> / Without this, browser uploads fail on the CORS preflight.
>
> ⚠️ L'origine envoyée par le navigateur est celle de la page en cours — sur la prod,
> c'est `https://www.caroline-30.fun` (l'apex redirige vers www). Si le bucket n'a que
> `localhost:3000`, tout upload depuis le site publié échoue avec `Failed to fetch`
> même avec des variables R2 correctes.
>
> Les **déploiements preview** (`c30-*.vercel.app`) sont volontairement EXCLUS de cette
> CORS : surface réduite + posture stealth (§10). Les variables `R2_*` ciblent quand même
> preview/development pour éviter des 500 côté `/api/upload`, mais le PUT navigateur y
> restera bloqué par la preflight — les tests d'upload se font en local ou sur le domaine
> de prod.

---

## 6. Lancer l'app / Run the app

```bash
npm run dev
```

Ouvrez / open `http://localhost:3000`. Créez un code d'invitation dans la table
`invites` (Studio ou SQL) puis testez le parcours inscription → post → blab.

---

## 7. Production (plus tard / later)

- Hébergez la base/auth sur un **Supabase hébergé** et mettez les variables
  `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  correspondantes dans Vercel.
- Ajoutez les **5 mêmes variables `R2_*`** dans Vercel (côté serveur — jamais en
  `NEXT_PUBLIC_`, sauf `R2_PUBLIC_URL` si besoin de l'URL publique côté client).
  / Add the same 5 `R2_*` vars in Vercel (server-side, never `NEXT_PUBLIC_`).
- Mettez à jour la CORS R2 pour ajouter l'origine Vercel (`https://<your-vercel-domain>`).

### Pièges Vercel appris en prod / Production gotchas

1. **Jamais de valeurs placeholder** : les 5 vars `R2_*` doivent venir de `.env.local`
   (identifiants réels Cloudflare). Des valeurs `your-r2-account-id` (venues de
   `.env.example`) rendent `/api/upload` silencieusement « OK » (la signature se
   calcule localement) mais le `PUT` navigateur échoue avec
   `net::ERR_SSL_VERSION_OR_CIPHER_MISMATCH` → « Failed to fetch » dans l'UI.
2. **`NEXT_PUBLIC_*` ne doit JAMAIS être de type `sensitive`** dans Vercel : les vars
   sensibles sont exclues du build, donc jamais inlinées dans le bundle client
   (symptôme : clé Giphy absente en prod). Utilisez `plain` ou `encrypted`.
3. **Chaque modification de variable d'environnement nécessite un redéploiement**
   pour prendre effet : les vars sont capturées à la création du deployment.

---

## Récapitulatif / Summary

| Élément              | Local                                     | Prod                  |
| -------------------- | ----------------------------------------- | --------------------- |
| Supabase (DB + Auth) | CLI + Docker (`127.0.0.1:54321`)          | Supabase hébergé      |
| Stockage médias      | **R2 cloud**                              | **R2 cloud**          |
| Confirmation email   | désactivée (`enable_confirmations=false`) | selon config hébergée |
