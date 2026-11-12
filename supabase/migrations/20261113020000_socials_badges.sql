-- Enlaces sociales en el perfil (con su propia visibilidad) e insignias públicas: clips ganadores y colección de cartas.

-- ---------- Enlaces sociales ----------
-- Solo el nombre de usuario de cada red (la web construye el enlace), nunca una URL libre.
alter table public.profiles
  add column social_twitch text check (social_twitch is null or social_twitch ~ '^[A-Za-z0-9_]{4,25}$'),
  add column social_youtube text check (social_youtube is null or social_youtube ~ '^[A-Za-z0-9._-]{3,30}$'),
  add column social_x text check (social_x is null or social_x ~ '^[A-Za-z0-9_]{1,15}$'),
  add column socials_visibility public.visibility not null default 'registered';
grant update (social_twitch, social_youtube, social_x, socials_visibility, dm_policy) on public.profiles to authenticated;

create or replace view public.profile_cards with (security_invoker = false) as
select
  p.id, p.display_name, p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice end as voice,
  p.created_at,
  case when public.can_see(p.id, p.socials_visibility) then p.social_twitch end as social_twitch,
  case when public.can_see(p.id, p.socials_visibility) then p.social_youtube end as social_youtube,
  case when public.can_see(p.id, p.socials_visibility) then p.social_x end as social_x,
  -- Si admite mensajes privados (solo con sesión tiene sentido).
  case when (select auth.uid()) is not null then p.dm_policy end as dm_policy
from public.profiles p
where (select auth.uid()) is not null
   or 'public' in (p.languages_visibility, p.availability_visibility, p.goals_visibility, p.voice_visibility, p.socials_visibility)
   or exists (select 1 from public.game_profiles gp where gp.user_id = p.id and gp.visibility = 'public');

-- ---------- Insignias ----------
-- Resumen público (con sesión) de lo que alguien ha conseguido: cartas por juego y clips ganadores (semanas cerradas).
-- Las cartas concretas siguen siendo privadas; solo se muestran los totales y las de rareza legendaria.
create function public.player_badges(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cards jsonb; awards jsonb := '[]'::jsonb; g record;
begin
  if auth.uid() is null or private.blocked_with(p_user) then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'game_id', x.game_id, 'owned', x.owned, 'total', x.total, 'legendary', x.legendary) order by x.sort), '[]'::jsonb)
  into cards
  from (
    select gm.id as game_id, gm.sort,
      count(uc.card_id)::int as owned,
      count(c.id)::int as total,
      coalesce(jsonb_agg(c.name order by c.name) filter (where uc.card_id is not null and c.rarity = 'legendary'), '[]'::jsonb) as legendary
    from public.games gm
    join public.collectible_cards c on c.game_id = gm.id and c.active
    left join public.user_cards uc on uc.card_id = c.id and uc.user_id = p_user
    where gm.active
    group by gm.id, gm.sort
  ) x
  where x.owned > 0;

  for g in select id from public.games where active loop
    awards := awards || coalesce((
      select jsonb_agg(jsonb_build_object('week_start', w.week_start, 'emblem', e.name, 'clip_id', cl.id, 'title', cl.title, 'game_id', g.id))
      from public.clip_weekly_winners(g.id, 52) w
      join public.clips cl on cl.id = w.clip_id
      join public.clip_emblems e on e.id = w.emblem_id
      where w.closed and cl.user_id = p_user
    ), '[]'::jsonb);
  end loop;

  return jsonb_build_object('cards', cards, 'clip_awards', awards);
end $$;
revoke execute on function public.player_badges(uuid) from public, anon;
grant execute on function public.player_badges(uuid) to authenticated;
