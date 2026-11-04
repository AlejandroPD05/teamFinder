-- Base: catálogo de juegos (datos de configuración) + perfil común + perfil por juego.
-- El catálogo se rellena en seed.sql; aquí solo estructura y RLS.

-- ---------- Catálogo por juego ----------
create table public.games (
  id text primary key check (id ~ '^[a-z0-9-]{2,32}$'),
  name text not null,
  active boolean not null default true,
  sort smallint not null default 0
);

create table public.game_roles (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null,
  name text not null,
  sort smallint not null default 0,
  active boolean not null default true,
  unique (game_id, slug)
);

create table public.game_characters (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  role_id uuid references public.game_roles (id) on delete set null,
  slug text not null,
  name text not null,
  active boolean not null default true,
  unique (game_id, slug)
);

create table public.game_ranks (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null,
  name text not null,
  tier smallint not null, -- orden ascendente para filtrar por rango mín–máx
  active boolean not null default true,
  unique (game_id, slug),
  unique (game_id, tier)
);

create table public.game_modes (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null,
  name text not null,
  party_size smallint not null check (party_size between 2 and 10),
  sort smallint not null default 0,
  active boolean not null default true,
  unique (game_id, slug)
);

create table public.game_regions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null,
  name text not null,
  sort smallint not null default 0,
  active boolean not null default true,
  unique (game_id, slug)
);

-- ---------- Perfil común (independiente del juego) ----------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 32),
  avatar_url text check (avatar_url is null or avatar_url ~ '^https://'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Perfil por juego ----------
create table public.game_profiles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  rank_id uuid references public.game_ranks (id) on delete set null,
  -- Procedencia del rango: hoy solo manual. 'verified' queda para RSO (post-beta).
  rank_source text not null default 'manual' check (rank_source in ('manual', 'verified')),
  region_id uuid references public.game_regions (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, game_id)
);

-- ---------- updated_at ----------
create function public.set_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger profiles_updated_at before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger game_profiles_updated_at before update on public.game_profiles
  for each row execute function public.set_updated_at();

-- ---------- Alta automática del perfil ----------
-- No se copia el correo: los datos personales no salen de auth.users.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := coalesce(
    meta -> 'custom_claims' ->> 'global_name',
    meta ->> 'full_name',
    meta ->> 'name',
    'Jugador'
  );
  avatar text := meta ->> 'avatar_url';
begin
  name := left(btrim(name), 32);
  if char_length(name) < 2 then
    name := 'Jugador';
  end if;
  if avatar is not null and avatar !~ '^https://' then
    avatar := null;
  end if;
  insert into public.profiles (id, display_name, avatar_url) values (new.id, name, avatar);
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------- RLS ----------
alter table public.games enable row level security;
alter table public.game_roles enable row level security;
alter table public.game_characters enable row level security;
alter table public.game_ranks enable row level security;
alter table public.game_modes enable row level security;
alter table public.game_regions enable row level security;
alter table public.profiles enable row level security;
alter table public.game_profiles enable row level security;

-- Catálogo: lectura pública, escritura solo por migraciones/service role.
create policy "catalog read" on public.games for select using (true);
create policy "catalog read" on public.game_roles for select using (true);
create policy "catalog read" on public.game_characters for select using (true);
create policy "catalog read" on public.game_ranks for select using (true);
create policy "catalog read" on public.game_modes for select using (true);
create policy "catalog read" on public.game_regions for select using (true);

-- Perfiles: solo usuarios registrados los ven (la visibilidad por campo llega en la fase 2).
create policy "profiles read" on public.profiles for select to authenticated using (true);
create policy "profiles update own" on public.profiles for update to authenticated
  using ((select auth.uid()) = id) with check ((select auth.uid()) = id);

create policy "game_profiles read" on public.game_profiles for select to authenticated using (true);
create policy "game_profiles insert own" on public.game_profiles for insert to authenticated
  with check ((select auth.uid()) = user_id);
create policy "game_profiles update own" on public.game_profiles for update to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "game_profiles delete own" on public.game_profiles for delete to authenticated
  using ((select auth.uid()) = user_id);

-- Privilegios mínimos: anon solo lee catálogo.
revoke all on public.profiles, public.game_profiles from anon;
revoke insert, delete on public.profiles from authenticated;
-- El id no se puede cambiar.
revoke update on public.profiles from authenticated;
grant update (display_name, avatar_url) on public.profiles to authenticated;
