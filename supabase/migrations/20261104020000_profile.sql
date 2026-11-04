-- Fase 2: perfil común con visibilidad por campo + datos de VALORANT (roles y pool de agentes).
-- Visibilidad: 'public' (cualquiera), 'registered' (con sesión), 'private' (solo el dueño).
-- Por defecto 'registered': los datos no salen a internet sin que el usuario lo decida.

create type public.visibility as enum ('public', 'registered', 'private');
create type public.character_status as enum ('main', 'comfort', 'playable', 'flexible');

-- ---------- Perfil común ----------
alter table public.profiles
  add column languages text[] not null default '{}'
    check (cardinality(languages) <= 6 and languages <@ array['es','en','pt','fr','de','it','ca','eu','gl']),
  add column availability text[] not null default '{}'
    check (availability <@ array[
      'weekday_morning','weekday_afternoon','weekday_evening','weekday_night',
      'weekend_morning','weekend_afternoon','weekend_evening','weekend_night']),
  add column goals text[] not null default '{}'
    check (goals <@ array['ranked','casual','improve','fun','meet']),
  add column voice text check (voice in ('voice', 'listen', 'text')),
  add column languages_visibility public.visibility not null default 'registered',
  add column availability_visibility public.visibility not null default 'registered',
  add column goals_visibility public.visibility not null default 'registered',
  add column voice_visibility public.visibility not null default 'registered';

grant update (languages, availability, goals, voice,
              languages_visibility, availability_visibility, goals_visibility, voice_visibility)
  on public.profiles to authenticated;

-- ---------- Perfil por juego ----------
alter table public.game_profiles
  add column flex boolean not null default false, -- etiqueta «Flex»: dispuesto a cambiar de rol
  add column visibility public.visibility not null default 'registered';

-- Roles del jugador (varios; como mucho uno principal).
create table public.player_roles (
  user_id uuid not null,
  game_id text not null,
  role_id uuid not null references public.game_roles (id) on delete cascade,
  is_primary boolean not null default false,
  primary key (user_id, game_id, role_id),
  foreign key (user_id, game_id) references public.game_profiles (user_id, game_id) on delete cascade
);
create unique index player_roles_one_primary on public.player_roles (user_id, game_id) where is_primary;

-- Pool de personajes (agentes) con su estado.
create table public.player_characters (
  user_id uuid not null,
  game_id text not null,
  character_id uuid not null references public.game_characters (id) on delete cascade,
  status public.character_status not null,
  primary key (user_id, game_id, character_id),
  foreign key (user_id, game_id) references public.game_profiles (user_id, game_id) on delete cascade
);

-- Coherencia: el rol/personaje debe ser del mismo juego.
create function public.check_same_game() returns trigger
language plpgsql set search_path = '' as $$
declare g text;
begin
  if tg_table_name = 'player_roles' then
    select game_id into g from public.game_roles where id = new.role_id;
  else
    select game_id into g from public.game_characters where id = new.character_id;
  end if;
  if g is distinct from new.game_id then
    raise exception 'El elemento no pertenece al juego %', new.game_id using errcode = '23514';
  end if;
  return new;
end $$;

create trigger player_roles_same_game before insert or update on public.player_roles
  for each row execute function public.check_same_game();
create trigger player_characters_same_game before insert or update on public.player_characters
  for each row execute function public.check_same_game();

-- ---------- RLS: las tablas base solo las ve y edita su dueño ----------
-- La lectura por terceros va por las vistas de abajo, que aplican la visibilidad por campo.
drop policy "profiles read" on public.profiles;
create policy "profiles read own" on public.profiles for select to authenticated
  using ((select auth.uid()) = id);

drop policy "game_profiles read" on public.game_profiles;
create policy "game_profiles read own" on public.game_profiles for select to authenticated
  using ((select auth.uid()) = user_id);

alter table public.player_roles enable row level security;
alter table public.player_characters enable row level security;

create policy "player_roles own" on public.player_roles for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy "player_characters own" on public.player_characters for all to authenticated
  using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.player_roles, public.player_characters from anon;

-- ---------- Visibilidad ----------
-- ¿Puede quien consulta ver un campo con visibilidad v del usuario owner?
create function public.can_see(owner uuid, v public.visibility) returns boolean
language sql stable set search_path = '' as $$
  select case
    when (select auth.uid()) = owner then true
    when v = 'public' then true
    when v = 'registered' then (select auth.uid()) is not null
    else false
  end
$$;

-- Vistas con los permisos del propietario (saltan RLS a propósito) y campos enmascarados.
-- Nombre y avatar son siempre visibles: son lo mínimo para una tarjeta de jugador.
create view public.profile_cards with (security_invoker = false) as
select
  p.id,
  p.display_name,
  p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice end as voice,
  p.created_at
from public.profiles p;

create view public.game_profile_cards with (security_invoker = false) as
select
  gp.user_id,
  gp.game_id,
  gp.rank_id,
  gp.rank_source,
  gp.region_id,
  gp.flex,
  gp.updated_at
from public.game_profiles gp
where public.can_see(gp.user_id, gp.visibility);

create view public.player_role_cards with (security_invoker = false) as
select pr.user_id, pr.game_id, pr.role_id, pr.is_primary
from public.player_roles pr
join public.game_profiles gp using (user_id, game_id)
where public.can_see(gp.user_id, gp.visibility);

create view public.player_character_cards with (security_invoker = false) as
select pc.user_id, pc.game_id, pc.character_id, pc.status
from public.player_characters pc
join public.game_profiles gp using (user_id, game_id)
where public.can_see(gp.user_id, gp.visibility);

revoke all on public.profile_cards, public.game_profile_cards,
  public.player_role_cards, public.player_character_cards from anon, authenticated;
grant select on public.profile_cards, public.game_profile_cards,
  public.player_role_cards, public.player_character_cards to anon, authenticated;

-- ---------- Guardado atómico del perfil de juego ----------
-- Sustituye roles y pool en una transacción. Siempre actúa sobre auth.uid().
create function public.save_game_profile(
  p_game_id text,
  p_rank_id uuid,
  p_region_id uuid,
  p_flex boolean,
  p_visibility public.visibility,
  p_roles jsonb,       -- [{"role_id": uuid, "is_primary": bool}]
  p_characters jsonb   -- [{"character_id": uuid, "status": "main"|...}]
) returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_roles, '[]')) > 4 or jsonb_array_length(coalesce(p_characters, '[]')) > 40 then
    raise exception 'Demasiados elementos' using errcode = '22023';
  end if;

  insert into public.game_profiles (user_id, game_id, rank_id, rank_source, region_id, flex, visibility)
  values (uid, p_game_id, p_rank_id, 'manual', p_region_id, p_flex, p_visibility)
  on conflict (user_id, game_id) do update
    set rank_id = excluded.rank_id, rank_source = 'manual', region_id = excluded.region_id,
        flex = excluded.flex, visibility = excluded.visibility;

  delete from public.player_roles where user_id = uid and game_id = p_game_id;
  insert into public.player_roles (user_id, game_id, role_id, is_primary)
  select uid, p_game_id, (r ->> 'role_id')::uuid, coalesce((r ->> 'is_primary')::boolean, false)
  from jsonb_array_elements(coalesce(p_roles, '[]')) r;

  delete from public.player_characters where user_id = uid and game_id = p_game_id;
  insert into public.player_characters (user_id, game_id, character_id, status)
  select uid, p_game_id, (c ->> 'character_id')::uuid, (c ->> 'status')::public.character_status
  from jsonb_array_elements(coalesce(p_characters, '[]')) c;
end $$;

revoke execute on function public.save_game_profile from public, anon;
grant execute on function public.save_game_profile to authenticated;
