-- Herramientas de comunidad: grupos en el Discord de TeamFinder, perfiles inactivos fuera de la búsqueda y uso de los
-- planes gratuitos en las estadísticas de moderación.

-- ===================================================================================================================
-- 1) Publicar un grupo compartido en el Discord de TeamFinder
-- ===================================================================================================================
-- Solo si el creador lo pide (después de compartirlo) y si hay webhook guardado en private.app_settings
-- ('discord_lobbies_webhook'). El mensaje lleva solo datos del catálogo y el enlace público: ni nombres ni notas.
alter table public.lobbies add column discord_posted_at timestamptz;

create function private.discord_lobbies_hook() returns text
language sql stable security definer set search_path = '' as $$
  select value from private.app_settings
  where key = 'discord_lobbies_webhook' and value ~ '^https://(discord\.com|discordapp\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$';
$$;
revoke execute on function private.discord_lobbies_hook() from public, anon, authenticated;

-- Para que la web enseñe el botón solo cuando la integración está conectada (sin revelar el webhook).
create function private.discord_lobbies_enabled() returns boolean
language sql stable security definer set search_path = '' as $$
  select private.discord_lobbies_hook() is not null;
$$;

-- Texto del mensaje: solo datos del catálogo y el enlace público (ni el nombre del creador ni su nota).
create function private.lobby_discord_message(p_lobby uuid) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  l record;
  site text := coalesce((select value from private.app_settings where key = 'site_url'), 'https://teamfinder-seven.vercel.app');
  free int;
  roles text;
begin
  select lb.id, lb.slots, lb.language, lb.starts_at, g.name as game_name, coalesce(m.name, lb.mode_slug) as mode_name,
    rmin.name as rank_min_name, rmax.name as rank_max_name, reg.name as region_name
  into l
  from public.lobbies lb
  join public.games g on g.id = lb.game_id
  left join public.game_modes m on m.game_id = lb.game_id and m.slug = lb.mode_slug
  left join public.game_ranks rmin on rmin.id = lb.rank_min_id
  left join public.game_ranks rmax on rmax.id = lb.rank_max_id
  left join public.game_regions reg on reg.id = lb.region_id
  where lb.id = p_lobby;
  if l.id is null then return null; end if;
  free := greatest(0, l.slots - (select count(*) from public.lobby_members x where x.lobby_id = l.id));
  roles := (select string_agg(r.name, ', ' order by r.sort) from public.lobby_needed_roles nr
            join public.game_roles r on r.id = nr.role_id where nr.lobby_id = l.id);
  return left(concat_ws(E'\n',
    format('**%s · %s** — %s de %s plazas libres', l.game_name, l.mode_name, free, l.slots),
    case when roles is not null then 'Busca: ' || roles end,
    nullif(concat_ws(' · ',
      case when l.rank_min_name is not null or l.rank_max_name is not null
        then 'Rango ' || coalesce(l.rank_min_name, '—') || '–' || coalesce(l.rank_max_name, '—') end,
      l.region_name,
      case when l.language is not null then upper(l.language) end), ''),
    case when l.starts_at is not null and l.starts_at > now()
      then 'Empieza el ' || to_char(l.starts_at at time zone 'Europe/Madrid', 'DD/MM "a las" HH24:MI') || ' (hora de España)' end,
    site || '/unete/' || l.id), 1900);
end $$;
revoke execute on function private.lobby_discord_message(uuid) from public, anon, authenticated;

create function private.post_lobby_discord(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare
  hook text := private.discord_lobbies_hook();
  l public.lobbies;
begin
  select * into l from public.lobbies where id = p_lobby and owner_id = auth.uid();
  if l.id is null then raise exception 'Solo el creador' using errcode = '42501'; end if;
  if hook is null then raise exception 'Sin integración' using errcode = 'P0001', hint = 'not_connected'; end if;
  if l.status <> 'open' then raise exception 'Grupo no abierto' using errcode = 'P0001', hint = 'closed'; end if;
  if l.shared_at is null then raise exception 'Sin compartir' using errcode = 'P0001', hint = 'not_shared'; end if;
  if l.discord_posted_at is not null then raise exception 'Ya publicado' using errcode = 'P0001', hint = 'already_posted'; end if;
  if private.restricted_until(auth.uid()) is not null then
    raise exception 'Cuenta restringida' using errcode = 'P0001', hint = 'restricted';
  end if;
  if (select count(*) from public.lobbies where owner_id = auth.uid() and discord_posted_at > now() - interval '1 day') >= 3 then
    raise exception 'Límite diario' using errcode = 'P0001', hint = 'limit_discord';
  end if;
  perform net.http_post(
    url := hook,
    body := jsonb_build_object('content', private.lobby_discord_message(l.id), 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  update public.lobbies set discord_posted_at = now() where id = l.id;
end $$;

-- ===================================================================================================================
-- 2) Perfiles inactivos fuera de la búsqueda
-- ===================================================================================================================
-- Última visita (como mucho se apunta cada 12 horas). Solo sirve para dejar de mostrar en la búsqueda y en «Te pueden
-- encajar» a quien no entra desde hace 60 días; no se enseña a nadie. Al volver a entrar, vuelve a salir.
create table private.user_activity (
  user_id uuid primary key references auth.users (id) on delete cascade,
  last_seen_at timestamptz not null default now()
);
revoke all on private.user_activity from public, anon, authenticated;
insert into private.user_activity (user_id, last_seen_at)
select id, coalesce(last_sign_in_at, created_at) from auth.users
on conflict (user_id) do nothing;

create function private.touch_seen() returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare seen timestamptz;
begin
  if auth.uid() is null then return null; end if;
  insert into private.user_activity as a (user_id) values (auth.uid())
  on conflict (user_id) do update set last_seen_at = now() where a.last_seen_at < now() - interval '12 hours';
  select last_seen_at into seen from private.user_activity where user_id = auth.uid();
  return seen;
end $$;

create function private.recently_seen(p_user uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select last_seen_at > now() - interval '60 days' from private.user_activity where user_id = p_user),
    (select created_at > now() - interval '60 days' from public.profiles where id = p_user), false);
$$;
revoke execute on function private.recently_seen(uuid) from public, anon, authenticated;

create or replace view private.player_search with (security_invoker = false) as
select p.id as user_id,
  gp.game_id,
  p.display_name,
  p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages else null::text[] end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability else null::text[] end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals else null::text[] end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice else null::text end as voice,
  gp.rank_id,
  r.tier as rank_tier,
  gp.rank_source,
  gp.region_id,
  gp.flex,
  gp.mode_slugs,
  coalesce(roles.role_ids, '{}'::uuid[]) as role_ids,
  roles.primary_role_id,
  coalesce(chars.character_ids, '{}'::uuid[]) as character_ids,
  coalesce(chars.char_keys, '{}'::text[]) as char_keys,
  greatest(p.updated_at, gp.updated_at) as updated_at
from public.profiles p
join public.game_profiles gp on gp.user_id = p.id
left join public.game_ranks r on r.id = gp.rank_id
left join lateral (
  select array_agg(pr.role_id) as role_ids, (array_agg(pr.role_id) filter (where pr.is_primary))[1] as primary_role_id
  from public.player_roles pr where pr.user_id = p.id and pr.game_id = gp.game_id
) roles on true
left join lateral (
  select array_agg(pc.character_id) as character_ids, array_agg((pc.character_id::text || ':') || pc.status::text) as char_keys
  from public.player_characters pc where pc.user_id = p.id and pc.game_id = gp.game_id
) chars on true
where public.can_see(gp.user_id, gp.visibility) and not private.blocked_with(p.id)
  -- En línea (no con private.recently_seen): dentro de una vista, las funciones se comprueban con los permisos de quien
  -- consulta, y no queremos que cualquiera pueda preguntar si otra persona ha entrado.
  and (p.id = (select auth.uid()) or gp.available_until > now()
    or coalesce((select ua.last_seen_at > now() - interval '60 days' from private.user_activity ua where ua.user_id = p.id),
                p.created_at > now() - interval '60 days'));

create or replace function private.suggested_players(p_game text, p_limit int default 5)
returns table (user_id uuid, reasons text[], available boolean)
language sql stable security definer set search_path = '' as $$
  with me as (
    select p.id, p.languages, p.availability, gp.region_id, r.tier as rank_tier,
      coalesce((select array_agg(pr.role_id) from public.player_roles pr where pr.user_id = p.id and pr.game_id = p_game), '{}') as roles
    from public.profiles p
    left join public.game_profiles gp on gp.user_id = p.id and gp.game_id = p_game
    left join public.game_ranks r on r.id = gp.rank_id
    where p.id = (select auth.uid())
  ),
  candidates as (
    select gp.user_id, gp.region_id, gp.updated_at, gp.available_until, r.tier as rank_tier, p.languages, p.availability,
      p.languages_visibility, p.availability_visibility
    from public.game_profiles gp
    join public.profiles p on p.id = gp.user_id
    left join public.game_ranks r on r.id = gp.rank_id
    where gp.game_id = p_game
      and gp.user_id <> (select auth.uid())
      and public.can_see(gp.user_id, gp.visibility)
      and not private.blocked_with(gp.user_id)
      and private.restricted_until(gp.user_id) is null
      and (gp.available_until > now() or (gp.updated_at > now() - interval '90 days' and private.recently_seen(gp.user_id)))
  ),
  scored as (
    select c.user_id, c.available_until > now() as available, c.updated_at,
      array_remove(array[
        case when cardinality(me.roles) > 0 and exists (
          select 1 from public.player_roles pr where pr.user_id = c.user_id and pr.game_id = p_game and not (pr.role_id = any(me.roles))
        ) then 'role' end,
        case when me.region_id is not null and c.region_id = me.region_id then 'region' end,
        case when public.can_see(c.user_id, c.availability_visibility) and c.availability && me.availability then 'schedule' end,
        case when me.rank_tier is not null and c.rank_tier is not null and abs(me.rank_tier - c.rank_tier) <= 3 then 'rank' end,
        case when public.can_see(c.user_id, c.languages_visibility) and c.languages && me.languages then 'language' end
      ], null) as reasons
    from candidates c, me
  )
  select s.user_id, s.reasons, coalesce(s.available, false)
  from scored s
  where cardinality(s.reasons) >= 2
  order by cardinality(s.reasons) desc, coalesce(s.available, false) desc, s.updated_at desc
  limit least(greatest(p_limit, 1), 10);
$$;

-- ===================================================================================================================
-- 3) Uso de los planes gratuitos en las estadísticas
-- ===================================================================================================================
create or replace function private.admin_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare since7 timestamptz := now() - interval '7 days'; since30 timestamptz := now() - interval '30 days';
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  return jsonb_build_object(
    'users', (select count(*) from public.profiles),
    'users_7d', (select count(*) from public.profiles where created_at > since7),
    'users_30d', (select count(*) from public.profiles where created_at > since30),
    'active_7d', (select count(*) from auth.users where last_sign_in_at > since7),
    'onboarded', (select count(*) from public.profiles where onboarded_at is not null),
    'lobbies_7d', (select count(*) from public.lobbies where created_at > since7),
    'lobbies_30d', (select count(*) from public.lobbies where created_at > since30),
    'filled_30d', (select count(*) from public.lobbies where created_at > since30 and filled_at is not null),
    'requests_30d', (select count(*) from public.lobby_requests where created_at > since30),
    'karma_30d', (select count(*) from public.karma_votes where created_at > since30),
    'teams', (select count(*) from public.teams),
    'clips_30d', (select count(*) from public.clips where created_at > since30),
    'messages_7d', (select count(*) from public.direct_messages where created_at > since7),
    'saved_searches', (select count(*) from public.saved_searches),
    'push_users', (select count(distinct user_id) from public.push_subscriptions),
    'email_users', (select count(*) from public.profiles where email_notifications),
    'feedback_new', (select count(*) from public.feedback where status = 'new'),
    'games', (select coalesce(jsonb_agg(jsonb_build_object('game_id', g.id, 'name', g.name,
        'profiles', (select count(*) from public.game_profiles gp where gp.game_id = g.id),
        'lobbies_30d', (select count(*) from public.lobbies l where l.game_id = g.id and l.created_at > since30)) order by g.sort), '[]')
      from public.games g where g.active),
    -- Uso frente a los planes gratuitos (los límites están en src/lib/admin-stats.ts).
    'db_bytes', pg_database_size(current_database()),
    'storage_bytes', (select coalesce(sum((metadata ->> 'size')::bigint), 0) from storage.objects),
    'seen_30d', (select count(*) from private.user_activity where last_seen_at > since30),
    'emails_today', (select count(*) from private.email_log where sent_at >= date_trunc('day', now())),
    'inactive_60d', (select count(*) from public.profiles p where not private.recently_seen(p.id)),
    'discord_lobbies_7d', (select count(*) from public.lobbies where discord_posted_at > since7)
  );
end $$;

-- ===================================================================================================================
-- Permisos y envoltorios
-- ===================================================================================================================
revoke execute on function private.post_lobby_discord(uuid), private.touch_seen(), private.discord_lobbies_enabled()
  from public, anon;
grant execute on function private.post_lobby_discord(uuid), private.touch_seen(), private.discord_lobbies_enabled()
  to authenticated;
select private.expose_function('private.post_lobby_discord(uuid)'::regprocedure);
select private.expose_function('private.touch_seen()'::regprocedure);
select private.expose_function('private.discord_lobbies_enabled()'::regprocedure);
