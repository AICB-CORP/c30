-- 0001_init.sql
-- Skyblog schema : tables, indexes, RLS, seed.
-- Column names match lib/types.ts (pseudo, avatar_url, bio, mood, skin, role,
-- is_private, music_embed, scheduled_for, coups_de_coeur, ...).

-- ============================================================
-- 1. profiles
-- ============================================================
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  pseudo text unique not null,
  avatar_url text,
  bio text,
  mood text,
  skin jsonb default '{}',
  role text not null default 'friend' check (role in ('friend','birthday_girl')),
  created_at timestamptz default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_authenticated" on public.profiles;
create policy "profiles_select_authenticated" on public.profiles
  for select to authenticated
  using (true);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update to authenticated
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- ============================================================
-- 2. posts
-- ============================================================
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  content text not null,
  is_private boolean not null default false,
  mood text,
  music_embed text,
  scheduled_for timestamptz,
  created_at timestamptz default now()
);

alter table public.posts enable row level security;

drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible" on public.posts
  for select to authenticated
  using (
    is_private = false
    or auth.uid() = author_id
    or exists (
      select 1 from public.profiles p
      where p.id = auth.uid()
        and p.role = 'birthday_girl'
    )
  );

drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own" on public.posts
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own" on public.posts
  for update to authenticated
  using (auth.uid() = author_id)
  with check (auth.uid() = author_id);

drop policy if exists "posts_delete_own" on public.posts;
create policy "posts_delete_own" on public.posts
  for delete to authenticated
  using (auth.uid() = author_id);

-- ============================================================
-- 3. post_media
-- ============================================================
create table if not exists public.post_media (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  type text not null check (type in ('image','video','audio','gif')),
  url text not null,
  position int not null default 0,
  caption text
);

alter table public.post_media enable row level security;

drop policy if exists "post_media_select_visible" on public.post_media;
create policy "post_media_select_visible" on public.post_media
  for select to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and (
          p.is_private = false
          or p.author_id = auth.uid()
          or exists (
            select 1 from public.profiles pr
            where pr.id = auth.uid()
              and pr.role = 'birthday_girl'
          )
        )
    )
  );

drop policy if exists "post_media_insert_own" on public.post_media;
create policy "post_media_insert_own" on public.post_media
  for insert to authenticated
  with check (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_id = auth.uid()
    )
  );

drop policy if exists "post_media_delete_own" on public.post_media;
create policy "post_media_delete_own" on public.post_media
  for delete to authenticated
  using (
    exists (
      select 1 from public.posts p
      where p.id = post_id
        and p.author_id = auth.uid()
    )
  );

-- ============================================================
-- 4. blab (shoutbox globale)
-- ============================================================
create table if not exists public.blab (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  created_at timestamptz default now()
);

alter table public.blab enable row level security;

drop policy if exists "blab_select_authenticated" on public.blab;
create policy "blab_select_authenticated" on public.blab
  for select to authenticated
  using (true);

drop policy if exists "blab_insert_own" on public.blab;
create policy "blab_insert_own" on public.blab
  for insert to authenticated
  with check (auth.uid() = author_id);

drop policy if exists "blab_delete_own" on public.blab;
create policy "blab_delete_own" on public.blab
  for delete to authenticated
  using (auth.uid() = author_id);

-- ============================================================
-- 5. coups_de_coeur (likes)
-- ============================================================
create table if not exists public.coups_de_coeur (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz default now(),
  primary key (post_id, user_id)
);

alter table public.coups_de_coeur enable row level security;

drop policy if exists "coups_de_coeur_select_authenticated" on public.coups_de_coeur;
create policy "coups_de_coeur_select_authenticated" on public.coups_de_coeur
  for select to authenticated
  using (true);

drop policy if exists "coups_de_coeur_insert_own" on public.coups_de_coeur;
create policy "coups_de_coeur_insert_own" on public.coups_de_coeur
  for insert to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "coups_de_coeur_delete_own" on public.coups_de_coeur;
create policy "coups_de_coeur_delete_own" on public.coups_de_coeur
  for delete to authenticated
  using (auth.uid() = user_id);

-- ============================================================
-- 6. invites (codes d'invitation, jamais exposes au client)
-- ============================================================
create table if not exists public.invites (
  id uuid primary key default gen_random_uuid(),
  code text unique not null,
  email text,
  role text not null default 'friend' check (role in ('friend','birthday_girl')),
  used_at timestamptz,
  created_at timestamptz default now()
);

-- RLS activée SANS aucune policy : seul service_role (qui bypass RLS) peut
-- accéder. Resultat : "server-only" reel + anon ne voit rien.
alter table public.invites enable row level security;

-- ============================================================
-- 7. visitor_counts (compteur odometre)
-- ============================================================
create table if not exists public.visitor_counts (
  id int primary key default 1,
  count bigint not null default 0
);

alter table public.visitor_counts enable row level security;

drop policy if exists "visitor_counts_select_authenticated" on public.visitor_counts;
create policy "visitor_counts_select_authenticated" on public.visitor_counts
  for select to authenticated
  using (true);

-- Pas de policy UPDATE : seul service_role (bypass RLS) peut incrementer.

-- ============================================================
-- Indexes
-- ============================================================
create index if not exists idx_posts_author_id on public.posts(author_id);
create index if not exists idx_posts_created_at on public.posts(created_at desc);
create index if not exists idx_blab_created_at on public.blab(created_at);
create index if not exists idx_coups_de_coeur_post_id on public.coups_de_coeur(post_id);

-- ============================================================
-- Seed
-- ============================================================
insert into public.visitor_counts (id, count)
values (1, 0)
on conflict (id) do nothing;