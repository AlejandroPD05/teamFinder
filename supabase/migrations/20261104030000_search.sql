-- Fase 3: modos preferidos en el perfil de juego + vista de búsqueda de jugadores.

-- ---------- Modos preferidos (DuoQ, TrioQ, FiveStack…) ----------
alter table public.game_profiles add column mode_slugs text[] not null default '{}';

create function public.check_mode_slugs() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from unnest(new.mode_slugs) s
    where not exists (select 1 from public.game_modes m where m.game_id = new.game_id and m.slug = s and m.active)
  ) then
    raise exception 'Modo no válido para %', new.game_id using errcode = '23514';
  end if;
  return new;
end $$;

create trigger game_profiles_modes before insert or update of mode_slugs on public.game_profiles
  for each row execute function public.check_mode_slugs();

-- save_game_profile con modos (sustituye a la versión de la fase 2).
drop function public.save_game_profile(text, uuid, uuid, boolean, public.visibility, jsonb, jsonb);

create function public.save_game_profile(
  p_game_id text,
  p_rank_id uuid,
  p_region_id uuid,
  p_flex boolean,
  p_visibility public.visibility,
  p_roles jsonb,
  p_characters jsonb,
  p_modes text[] default '{}'
) returns void
language plpgsql security invoker set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Sin sesión' using errcode = '42501';
  end if;
  if jsonb_array_length(coalesce(p_roles, '[]')) > 4 or jsonb_array_length(coalesce(p_characters, '[]')) > 40
     or cardinality(coalesce(p_modes, '{}')) > 10 then
    raise exception 'Demasiados elementos' using errcode = '22023';
  end if;

  insert into public.game_profiles (user_id, game_id, rank_id, rank_source, region_id, flex, visibility, mode_slugs)
  values (uid, p_game_id, p_rank_id, 'manual', p_region_id, p_flex, p_visibility, coalesce(p_modes, '{}'))
  on conflict (user_id, game_id) do update
    set rank_id = excluded.rank_id, rank_source = 'manual', region_id = excluded.region_id,
        flex = excluded.flex, visibility = excluded.visibility, mode_slugs = excluded.mode_slugs;

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

-- La vista de tarjetas de juego expone ahora los modos.
create or replace view public.game_profile_cards with (security_invoker = false) as
select gp.user_id, gp.game_id, gp.rank_id, gp.rank_source, gp.region_id, gp.flex, gp.updated_at, gp.mode_slugs
from public.game_profiles gp
where public.can_see(gp.user_id, gp.visibility);

-- ---------- Vista de búsqueda ----------
-- Una fila por jugador y juego, solo con datos que quien consulta puede ver.
-- Filtrar aquí nunca revela un campo oculto: si no es visible, vale null y no coincide.
-- `char_keys` = 'uuid:estado' para filtrar «agente X como main/comfort» con un solo operador.
create view public.player_search with (security_invoker = false) as
select
  p.id as user_id,
  gp.game_id,
  p.display_name,
  p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice end as voice,
  gp.rank_id,
  r.tier as rank_tier,
  gp.rank_source,
  gp.region_id,
  gp.flex,
  gp.mode_slugs,
  coalesce(roles.role_ids, '{}') as role_ids,
  roles.primary_role_id,
  coalesce(chars.character_ids, '{}') as character_ids,
  coalesce(chars.char_keys, '{}') as char_keys,
  greatest(p.updated_at, gp.updated_at) as updated_at
from public.profiles p
join public.game_profiles gp on gp.user_id = p.id
left join public.game_ranks r on r.id = gp.rank_id
left join lateral (
  select array_agg(pr.role_id) as role_ids,
         (array_agg(pr.role_id) filter (where pr.is_primary))[1] as primary_role_id
  from public.player_roles pr where pr.user_id = p.id and pr.game_id = gp.game_id
) roles on true
left join lateral (
  select array_agg(pc.character_id) as character_ids,
         array_agg(pc.character_id::text || ':' || pc.status::text) as char_keys
  from public.player_characters pc where pc.user_id = p.id and pc.game_id = gp.game_id
) chars on true
where public.can_see(gp.user_id, gp.visibility);

revoke all on public.player_search from anon, authenticated;
grant select on public.player_search to authenticated;

-- Índices para los filtros y el orden.
create index game_profiles_game_updated on public.game_profiles (game_id, updated_at desc);
create index player_characters_user on public.player_characters (user_id, game_id);
create index player_roles_user on public.player_roles (user_id, game_id);
