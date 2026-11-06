-- Misiones y cartas coleccionables (decisión del usuario 2026-11-06; amplía el alcance del prompt, ver PROGRESS.md).
-- Las cartas son recompensas digitales: no se compran, no se venden ni se intercambian (sin economía).
-- Arte: solo oficial y de uso permitido para webs de fans sin ánimo de lucro (Riot «Legal Jibber Jabber», política de
-- contenido de EA). El fanart queda como punto de extensión: necesita el permiso de cada artista (columnas credit/source).

-- ---------- Grupos llenos ----------
-- Momento en que un grupo se llenó por primera vez (no se borra si luego alguien sale).
alter table public.lobbies add column filled_at timestamptz;

create or replace function public.lobby_refresh_status(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n int; cap int; st public.lobby_status;
begin
  select slots, status into cap, st from public.lobbies where id = p_lobby;
  if st = 'closed' then return; end if;
  select count(*) into n from public.lobby_members where lobby_id = p_lobby;
  update public.lobbies
  set status = case when n >= cap then 'full'::public.lobby_status else 'open' end,
      filled_at = case when n >= cap then coalesce(filled_at, now()) else filled_at end
  where id = p_lobby
    and (status is distinct from (case when n >= cap then 'full'::public.lobby_status else 'open' end)
         or (n >= cap and filled_at is null));
end $$;
revoke execute on function public.lobby_refresh_status(uuid) from public, anon, authenticated;

-- ---------- Catálogo ----------
create type public.card_rarity as enum ('common', 'rare', 'epic', 'legendary');

create table public.collectible_cards (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,48}$'),
  name text not null check (char_length(name) between 1 and 60),
  image_url text not null check (
    image_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$'
    or image_url ~ '^https://drop-assets\.ea\.com/images/[A-Za-z0-9/_.\-]+\.(jpg|png)$'
  ),
  rarity public.card_rarity not null default 'common',
  source text not null default 'official' check (source in ('official', 'fanart')),
  credit text not null check (char_length(credit) between 2 and 120),
  active boolean not null default true,
  sort smallint not null default 0,
  unique (game_id, slug)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,48}$'),
  title text not null,
  description text not null,
  kind text not null check (kind in ('fill_lobbies')),
  target smallint not null check (target between 1 and 100),
  -- Antiabuso: grupos que cuentan como mucho por día y antigüedad mínima de las cuentas de los demás miembros.
  max_per_day smallint not null default 1 check (max_per_day between 1 and 100),
  min_member_age interval not null default interval '1 day',
  active boolean not null default true,
  sort smallint not null default 0,
  unique (game_id, slug)
);

create table public.user_cards (
  user_id uuid not null references public.profiles (id) on delete cascade,
  card_id uuid not null references public.collectible_cards (id) on delete cascade,
  obtained_at timestamptz not null default now(),
  primary key (user_id, card_id)
);

create table public.mission_claims (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  mission_id uuid not null references public.missions (id) on delete cascade,
  card_id uuid references public.collectible_cards (id) on delete set null,
  claimed_at timestamptz not null default now()
);
create index mission_claims_user on public.mission_claims (user_id, mission_id);

alter table public.collectible_cards enable row level security;
alter table public.missions enable row level security;
alter table public.user_cards enable row level security;
alter table public.mission_claims enable row level security;

create policy "cards read" on public.collectible_cards for select to anon, authenticated using (active);
create policy "missions read" on public.missions for select to anon, authenticated using (active);
create policy "user_cards own" on public.user_cards for select to authenticated using ((select auth.uid()) = user_id);
create policy "claims own" on public.mission_claims for select to authenticated using ((select auth.uid()) = user_id);

-- Solo se escriben desde las funciones de abajo.
revoke insert, update, delete on public.collectible_cards, public.missions, public.user_cards, public.mission_claims
  from anon, authenticated;

-- ---------- Progreso ----------
-- Grupos que cuentan para una misión de «llenar grupos»: del usuario y del juego, cerrados, llenos al cerrar, con los
-- demás miembros con cuentas de cierta antigüedad, y como mucho `max_per_day` por día (contra el farmeo).
create function private.mission_count(p_user uuid, p_mission uuid) returns int
language sql stable security definer set search_path = '' as $$
  with m as (select * from public.missions where id = p_mission),
  eligible as (
    select l.filled_at::date as d
    from public.lobbies l, m
    where l.owner_id = p_user and l.game_id = m.game_id and l.status = 'closed' and l.filled_at is not null
      and (select count(*) from public.lobby_members lm where lm.lobby_id = l.id) >= l.slots
      and not exists (
        select 1 from public.lobby_members lm join auth.users u on u.id = lm.user_id
        where lm.lobby_id = l.id and lm.user_id <> l.owner_id and u.created_at > l.filled_at - m.min_member_age
      )
  )
  select coalesce(sum(least(c, (select max_per_day from m))), 0)::int
  from (select d, count(*) as c from eligible group by d) per_day;
$$;
revoke execute on function private.mission_count(uuid, uuid) from public, anon, authenticated;

-- Misiones activas de un juego con el progreso de quien llama.
create function public.my_missions(p_game text)
returns table (
  id uuid, slug text, title text, description text, target int,
  progress int, claimable boolean, claims int, cards_owned int, cards_total int
)
language plpgsql stable security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  return query
  with base as (
    select m.*, private.mission_count(uid, m.id) as counted,
      (select count(*) from public.mission_claims mc where mc.user_id = uid and mc.mission_id = m.id)::int as n_claims
    from public.missions m where m.game_id = p_game and m.active
  ),
  cards as (
    select count(*)::int as total,
      count(*) filter (where exists (select 1 from public.user_cards uc where uc.user_id = uid and uc.card_id = c.id))::int as owned
    from public.collectible_cards c where c.game_id = p_game and c.active
  )
  select b.id, b.slug, b.title, b.description, b.target::int,
    least(b.counted - b.n_claims * b.target, b.target::int) as progress,
    (b.counted - b.n_claims * b.target >= b.target and cards.owned < cards.total) as claimable,
    b.n_claims, cards.owned, cards.total
  from base b, cards
  order by b.sort, b.title;
end $$;
revoke execute on function public.my_missions(text) from public, anon;
grant execute on function public.my_missions(text) to authenticated;

-- Reclama la recompensa: una carta del juego que aún no tienes, al azar ponderado por rareza.
create function public.claim_mission(p_mission uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m record; n_claims int; card uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  -- Una reclamación a la vez por usuario y misión (evita dobles clics y condiciones de carrera).
  perform pg_advisory_xact_lock(hashtextextended(uid::text || ':' || p_mission::text, 0));
  select * into m from public.missions where id = p_mission and active;
  if m.id is null then raise exception 'No existe' using errcode = 'P0001', hint = 'not_found'; end if;
  select count(*) into n_claims from public.mission_claims where user_id = uid and mission_id = p_mission;
  if private.mission_count(uid, p_mission) - n_claims * m.target < m.target then
    raise exception 'Misión sin completar' using errcode = 'P0001', hint = 'not_completed';
  end if;
  select c.id into card from public.collectible_cards c
  where c.game_id = m.game_id and c.active
    and not exists (select 1 from public.user_cards uc where uc.user_id = uid and uc.card_id = c.id)
  order by -ln(1 - random()) / (case c.rarity when 'common' then 60 when 'rare' then 25 when 'epic' then 12 else 3 end)
  limit 1;
  if card is null then raise exception 'Colección completa' using errcode = 'P0001', hint = 'collection_complete'; end if;
  insert into public.user_cards (user_id, card_id) values (uid, card);
  insert into public.mission_claims (user_id, mission_id, card_id) values (uid, p_mission, card);
  return card;
end $$;
revoke execute on function public.claim_mission(uuid) from public, anon;
grant execute on function public.claim_mission(uuid) to authenticated;

-- ---------- Datos ----------
-- Una misión por juego con cartas (CS2 no tiene arte de uso permitido). Se crea solo para los juegos que existen.
insert into public.missions (game_id, slug, title, description, kind, target, sort)
select g.id, 'llenar-grupos', 'Llena 10 grupos',
  'Crea grupos de ' || g.name || ', llénalos y ciérralos al terminar de jugar. Cuenta uno al día.', 'fill_lobbies', 10, 1
from public.games g where g.id in ('valorant', 'apex')
on conflict (game_id, slug) do nothing;

-- Rareza fija por carta (estable entre despliegues): ~5 % legendaria, 15 % épica, 30 % rara, resto común.
create function private.card_rarity_for(p_slug text) returns public.card_rarity
language sql immutable set search_path = '' as $$
  select case
    when b < 13 then 'legendary'::public.card_rarity
    when b < 51 then 'epic'
    when b < 128 then 'rare'
    else 'common'
  end
  from (select get_byte(decode(md5('tf-card:' || p_slug), 'hex'), 0) as b) x;
$$;

-- Apex: imagen oficial de cada leyenda (web de EA). VALORANT: retrato completo oficial de cada agente (valorant-api.com).
insert into public.collectible_cards (game_id, slug, name, image_url, rarity, credit, sort)
select c.game_id, c.slug, c.name,
  case when c.game_id = 'valorant' then replace(c.icon_url, 'displayicon.png', 'fullportrait.png') else c.icon_url end,
  private.card_rarity_for(c.game_id || ':' || c.slug),
  case when c.game_id = 'valorant' then 'Arte oficial de Riot Games' else 'Arte oficial de Electronic Arts' end,
  0
from public.game_characters c
where c.active and c.icon_url is not null and c.game_id in ('valorant', 'apex')
on conflict (game_id, slug) do nothing;
