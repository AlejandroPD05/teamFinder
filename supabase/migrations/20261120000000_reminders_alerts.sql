-- Avisos y alertas (2026-11-14):
-- 1) Al cerrarse un grupo de 2 o más, aviso a cada miembro para valorar a sus compañeros (karma).
-- 2) Aviso 15 minutos antes de que empiece un grupo con hora («Más tarde»).
-- 3) Búsquedas guardadas con alerta: avisa cuando alguien que encaja se marca «disponible ahora».
-- 4) Estadísticas agregadas para moderación (solo recuentos, nada personal).

alter type public.notification_kind add value if not exists 'karma_reminder';
alter type public.notification_kind add value if not exists 'lobby_starting';
alter type public.notification_kind add value if not exists 'search_match';

-- ===================================================================================================================
-- 1) Recordatorio de karma al cerrar un grupo
-- ===================================================================================================================
create function private.on_lobby_closed() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select count(*) from public.lobby_members where lobby_id = new.id) >= 2 then
    perform private.notify(m.user_id, 'karma_reminder', null, new.id, null, null)
    from public.lobby_members m where m.lobby_id = new.id;
  end if;
  return new;
end $$;
create trigger lobbies_closed_karma after update of status on public.lobbies
  for each row when (new.status = 'closed' and old.status is distinct from 'closed')
  execute function private.on_lobby_closed();
revoke execute on function private.on_lobby_closed() from public, anon, authenticated;

-- ===================================================================================================================
-- 2) Aviso antes de empezar
-- ===================================================================================================================
alter table public.lobbies add column reminded_at timestamptz;

-- Cada 5 minutos: grupos que empiezan en los próximos 15 minutos y aún no se han avisado.
create function private.remind_starting_lobbies() returns int
language plpgsql security definer set search_path = '' as $$
declare l record; n int := 0;
begin
  for l in
    select id from public.lobbies
    where status <> 'closed' and reminded_at is null and starts_at is not null
      and starts_at > now() and starts_at <= now() + interval '15 minutes'
    for update skip locked
  loop
    perform private.notify(m.user_id, 'lobby_starting', null, l.id, null, null)
    from public.lobby_members m where m.lobby_id = l.id;
    update public.lobbies set reminded_at = now() where id = l.id;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function private.remind_starting_lobbies() from public, anon, authenticated;
-- Solo pg_cron; la web no lo usa.
select cron.schedule('remind-starting-lobbies', '*/5 * * * *', 'select private.remind_starting_lobbies()');

-- ===================================================================================================================
-- 3) Búsquedas guardadas con alerta
-- ===================================================================================================================
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40 and name !~ '[<>]'),
  -- Parámetros de /buscar para volver a abrirla tal cual.
  query text not null default '' check (char_length(query) <= 500 and query !~ '[<>\s]'),
  -- Lo que se comprueba para la alerta (lo demás solo sirve para la búsqueda).
  role_id uuid references public.game_roles (id) on delete cascade,
  rank_min_tier smallint,
  rank_max_tier smallint,
  region_id uuid references public.game_regions (id) on delete cascade,
  language text check (language is null or language ~ '^[a-z]{2}$'),
  alerts boolean not null default true,
  last_alert_at timestamptz,
  created_at timestamptz not null default now()
);
create index saved_searches_user on public.saved_searches (user_id, game_id);
create index saved_searches_game_alerts on public.saved_searches (game_id) where alerts;
create index saved_searches_role on public.saved_searches (role_id);
create index saved_searches_region on public.saved_searches (region_id);
alter table public.saved_searches enable row level security;
create policy "saved searches own read" on public.saved_searches for select to authenticated using (user_id = (select auth.uid()));
create policy "saved searches own delete" on public.saved_searches for delete to authenticated using (user_id = (select auth.uid()));
create policy "saved searches own update" on public.saved_searches for update to authenticated
  using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
revoke insert, update on public.saved_searches from authenticated;
grant update (alerts) on public.saved_searches to authenticated;
revoke all on public.saved_searches from anon;

-- Guardar una búsqueda (como mucho 5 por juego). Los ids se comprueban contra el catálogo de ese juego.
create function private.save_search(p_game text, p_name text, p_query text, p_role uuid, p_rank_min uuid, p_rank_max uuid,
  p_region uuid, p_language text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); sid uuid; tmin smallint; tmax smallint;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if (select count(*) from public.saved_searches where user_id = uid and game_id = p_game) >= 5 then
    raise exception 'Ya tienes 5 búsquedas guardadas' using errcode = 'P0001', hint = 'limit_searches';
  end if;
  if (p_role is not null and not exists (select 1 from public.game_roles where id = p_role and game_id = p_game))
     or (p_region is not null and not exists (select 1 from public.game_regions where id = p_region and game_id = p_game)) then
    raise exception 'Filtro no válido' using errcode = '22023', hint = 'invalid';
  end if;
  select tier into tmin from public.game_ranks where id = p_rank_min and game_id = p_game;
  select tier into tmax from public.game_ranks where id = p_rank_max and game_id = p_game;
  insert into public.saved_searches (user_id, game_id, name, query, role_id, rank_min_tier, rank_max_tier, region_id, language)
  values (uid, p_game, btrim(p_name), coalesce(p_query, ''), p_role, tmin, tmax, p_region, nullif(p_language, ''))
  returning id into sid;
  return sid;
end $$;

-- Al marcarse alguien «disponible ahora»: avisa a quien tenga una búsqueda guardada que encaje (como mucho una alerta
-- cada 3 horas por búsqueda). Respeta la visibilidad del perfil de juego, idiomas ocultos, bloqueos y restricciones.
create function private.on_available_alerts() returns trigger
language plpgsql security definer set search_path = '' as $$
declare p record; s record; tier smallint;
begin
  if new.available_until is null or new.available_until <= now()
     or (old.available_until is not null and old.available_until > now()) then
    return new;
  end if;
  if new.visibility = 'private' or private.restricted_until(new.user_id) is not null then return new; end if;
  select languages, languages_visibility into p from public.profiles where id = new.user_id;
  select r.tier into tier from public.game_ranks r where r.id = new.rank_id;
  for s in
    select ss.* from public.saved_searches ss
    where ss.game_id = new.game_id and ss.alerts and ss.user_id <> new.user_id
      and (ss.last_alert_at is null or ss.last_alert_at < now() - interval '3 hours')
      and (ss.role_id is null or exists (select 1 from public.player_roles pr where pr.user_id = new.user_id and pr.game_id = new.game_id and pr.role_id = ss.role_id))
      and (ss.region_id is null or ss.region_id = new.region_id)
      and (ss.rank_min_tier is null or tier >= ss.rank_min_tier)
      and (ss.rank_max_tier is null or tier <= ss.rank_max_tier)
      and (ss.language is null or (p.languages_visibility <> 'private' and ss.language = any(p.languages)))
      and not exists (select 1 from public.user_blocks b
        where (b.blocker_id = ss.user_id and b.blocked_id = new.user_id) or (b.blocker_id = new.user_id and b.blocked_id = ss.user_id))
    for update of ss skip locked
  loop
    perform private.notify(s.user_id, 'search_match', new.user_id, null, null, s.name);
    update public.saved_searches set last_alert_at = now() where id = s.id;
  end loop;
  return new;
end $$;
create trigger game_profiles_available_alerts after update of available_until on public.game_profiles
  for each row execute function private.on_available_alerts();
revoke execute on function private.on_available_alerts() from public, anon, authenticated;

-- ===================================================================================================================
-- 4) Estadísticas para moderación (solo recuentos)
-- ===================================================================================================================
create function private.admin_stats() returns jsonb
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
      from public.games g where g.active)
  );
end $$;

do $$
declare f text;
begin
  foreach f in array array['private.save_search(text, text, text, uuid, uuid, uuid, uuid, text)', 'private.admin_stats()'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;

-- Títulos de los push de los avisos nuevos.
create or replace function private.on_notification_push() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.push_notify(new.user_id,
    case new.kind
      when 'join_request' then 'Quieren unirse a tu grupo'
      when 'request_accepted' then 'Te han aceptado en un grupo'
      when 'request_rejected' then 'No te han aceptado en un grupo'
      when 'clip_comment' then 'Han comentado tu clip'
      when 'karma' then 'Te han dado un reconocimiento'
      when 'restriction' then 'Tu cuenta está restringida temporalmente'
      when 'fanart' then 'Novedades sobre tu fanart'
      when 'ranking' then '¡Estás en el Top 10 semanal!'
      when 'team_invite' then 'Te invitan a un equipo'
      when 'team_joined' then 'Nuevo miembro en tu equipo'
      when 'team_event' then 'Nueva quedada en tu equipo'
      when 'team_lobby' then 'Tu equipo ha creado un grupo'
      when 'friend_joined' then 'Un amigo ha entrado con tu invitación'
      when 'karma_reminder' then 'Valora a tus compañeros'
      when 'lobby_starting' then 'Tu grupo empieza en 15 minutos'
      when 'search_match' then 'Hay alguien disponible para tu búsqueda'
      else 'Tienes un aviso nuevo' end,
    new.body,
    case
      when new.kind = 'search_match' and new.actor_id is not null then '/jugador/' || new.actor_id
      when new.lobby_id is not null then '/grupos/' || new.lobby_id
      when new.clip_id is not null then '/clips/' || new.clip_id
      when new.team_id is not null then '/equipo/' || new.team_id
      else '/notificaciones' end);
  return new;
end $$;
