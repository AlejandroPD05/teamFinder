-- Mejoras de comunidad (2026-11-13):
-- 1) «Disponible ahora»: marcarse disponible 1–3 horas en un juego (opcionalmente con modo), con filtro en la
--    búsqueda y contador público en la portada.
-- 2) Compartir un grupo fuera de la web (Discord): enlace público con un resumen sin datos personales salvo el nombre
--    visible de quien lo crea, solo si su dueño lo comparte.
-- 3) Quedadas de equipo: proponer día y hora, responder (voy / quizá / no) y crear el grupo con los que van.
-- 4) Guía de bienvenida: `profiles.onboarded_at` (las cuentas que ya existían se dan por guiadas).
-- 5) Notificaciones push: suscripciones del navegador y envío vía la web (que firma con las claves VAPID).

alter type public.notification_kind add value if not exists 'team_event';
alter type public.notification_kind add value if not exists 'team_lobby';

-- ===================================================================================================================
-- 1) Disponible ahora
-- ===================================================================================================================
alter table public.game_profiles
  add column available_until timestamptz,
  add column available_mode text check (available_mode is null or available_mode ~ '^[a-z0-9-]{1,32}$');
create index game_profiles_available on public.game_profiles (game_id, available_until) where available_until is not null;

create function private.set_available(p_game text, p_hours int, p_mode text default null) returns timestamptz
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); until timestamptz;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_hours = 0 then
    update public.game_profiles set available_until = null, available_mode = null where user_id = uid and game_id = p_game;
    return null;
  end if;
  if p_hours not between 1 and 3 then raise exception 'Duración no válida' using errcode = '22023', hint = 'invalid'; end if;
  if private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida temporalmente' using errcode = 'P0001', hint = 'restricted';
  end if;
  if p_mode is not null and not exists (select 1 from public.game_modes where game_id = p_game and slug = p_mode and active) then
    raise exception 'Modo no válido' using errcode = '23514', hint = 'invalid';
  end if;
  until := now() + make_interval(hours => p_hours);
  update public.game_profiles set available_until = until, available_mode = p_mode where user_id = uid and game_id = p_game;
  if not found then raise exception 'Sin perfil de juego' using errcode = 'P0001', hint = 'no_profile'; end if;
  return until;
end $$;

-- Quién está disponible ahora en un juego (respeta la visibilidad del perfil de juego y los bloqueos).
create function private.available_now(p_game text)
returns table (user_id uuid, available_until timestamptz, mode_slug text)
language sql stable security definer set search_path = '' as $$
  select gp.user_id, gp.available_until, gp.available_mode
  from public.game_profiles gp
  where gp.game_id = p_game and gp.available_until > now()
    and public.can_see(gp.user_id, gp.visibility)
    and not private.blocked_with(gp.user_id)
    and private.restricted_until(gp.user_id) is null
  order by gp.available_until desc;
$$;

-- Cuántos hay disponibles por juego (dato agregado y público, como el contador de jugadores).
create function private.available_counts() returns table (game_id text, players int)
language sql stable security definer set search_path = '' as $$
  select g.id, (select count(*) from public.game_profiles gp where gp.game_id = g.id and gp.available_until > now())::int
  from public.games g where g.active;
$$;

-- ===================================================================================================================
-- 2) Compartir un grupo
-- ===================================================================================================================
alter table public.lobbies add column shared_at timestamptz;

create function private.share_lobby(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare l record;
begin
  select * into l from public.lobbies where id = p_lobby and owner_id = auth.uid();
  if l.id is null then raise exception 'Solo el creador' using errcode = '42501'; end if;
  if l.status = 'closed' then raise exception 'Grupo cerrado' using errcode = 'P0001', hint = 'closed'; end if;
  update public.lobbies set shared_at = coalesce(shared_at, now()) where id = p_lobby;
end $$;

-- Resumen público de un grupo compartido (sin sesión). Solo lo que se ve en su tarjeta.
create function private.shared_lobby(p_lobby uuid)
returns table (
  id uuid, game_id text, game_name text, mode_name text, slots int, taken int, roles text[],
  rank_min text, rank_max text, region text, language text, goal text, starts_at timestamptz, note text,
  status public.lobby_status, owner_name text
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.game_id, g.name, coalesce(m.name, l.mode_slug), l.slots,
    (select count(*) from public.lobby_members x where x.lobby_id = l.id)::int,
    coalesce((select array_agg(r.name order by r.sort) from public.lobby_needed_roles nr
              join public.game_roles r on r.id = nr.role_id where nr.lobby_id = l.id), '{}'),
    rmin.name, rmax.name, reg.name, l.language, l.goal, l.starts_at, l.note, l.status, p.display_name
  from public.lobbies l
  join public.games g on g.id = l.game_id
  left join public.game_modes m on m.game_id = l.game_id and m.slug = l.mode_slug
  left join public.game_ranks rmin on rmin.id = l.rank_min_id
  left join public.game_ranks rmax on rmax.id = l.rank_max_id
  left join public.game_regions reg on reg.id = l.region_id
  left join public.profiles p on p.id = l.owner_id
  where l.id = p_lobby and l.shared_at is not null;
$$;

-- ===================================================================================================================
-- 3) Quedadas de equipo
-- ===================================================================================================================
alter table public.notifications add column team_id uuid references public.teams (id) on delete cascade;
create index notifications_team_id_fk on public.notifications (team_id);

create table public.team_events (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  starts_at timestamptz not null,
  note text check (note is null or (char_length(note) <= 200 and note !~ '[<>]')),
  lobby_id uuid references public.lobbies (id) on delete set null,
  created_at timestamptz not null default now()
);
create index team_events_team on public.team_events (team_id, starts_at);
create index team_events_created_by on public.team_events (created_by);
create index team_events_lobby on public.team_events (lobby_id);

create table public.team_event_rsvps (
  event_id uuid not null references public.team_events (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  answer text not null check (answer in ('yes', 'maybe', 'no')),
  updated_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
create index team_event_rsvps_user on public.team_event_rsvps (user_id);

alter table public.team_events enable row level security;
alter table public.team_event_rsvps enable row level security;
create policy "team events read" on public.team_events for select to authenticated using (private.is_team_member(team_id));
create policy "team rsvps read" on public.team_event_rsvps for select to authenticated
  using (exists (select 1 from public.team_events e where e.id = event_id and private.is_team_member(e.team_id)));
revoke all on public.team_events, public.team_event_rsvps from anon;
revoke insert, update, delete on public.team_events, public.team_event_rsvps from authenticated;
create trigger team_events_restricted before insert on public.team_events
  for each row execute function private.block_if_restricted('created_by');

create function private.notify_team(p_user uuid, p_kind public.notification_kind, p_actor uuid, p_team uuid,
  p_lobby uuid, p_body text) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, actor_id, team_id, lobby_id, body)
  select p_user, p_kind, p_actor, p_team, p_lobby, left(p_body, 300)
  where p_user is not null and p_user is distinct from p_actor;
$$;

create function private.create_team_event(p_team uuid, p_starts_at timestamptz, p_note text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); eid uuid; t record; m record;
begin
  select * into t from public.teams where id = p_team;
  if t.id is null or not exists (select 1 from public.team_members where team_id = p_team and user_id = uid) then
    raise exception 'No eres del equipo' using errcode = 'P0001', hint = 'not_member';
  end if;
  if p_starts_at < now() - interval '1 hour' or p_starts_at > now() + interval '30 days' then
    raise exception 'Fecha fuera de rango' using errcode = '23514', hint = 'invalid';
  end if;
  if (select count(*) from public.team_events where team_id = p_team and starts_at > now()) >= 5 then
    raise exception 'Demasiadas quedadas' using errcode = 'P0001', hint = 'limit_events';
  end if;
  insert into public.team_events (team_id, created_by, starts_at, note)
  values (p_team, uid, p_starts_at, nullif(btrim(p_note), '')) returning id into eid;
  insert into public.team_event_rsvps (event_id, user_id, answer) values (eid, uid, 'yes');
  for m in select user_id from public.team_members where team_id = p_team and user_id <> uid loop
    perform private.notify_team(m.user_id, 'team_event', uid, p_team, null,
      '«' || t.name || '»: ' || to_char(p_starts_at at time zone 'Europe/Madrid', 'DD/MM "a las" HH24:MI')
      || coalesce(' · ' || nullif(btrim(p_note), ''), ''));
  end loop;
  return eid;
end $$;

create function private.rsvp_team_event(p_event uuid, p_answer text) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e record;
begin
  select * into e from public.team_events where id = p_event;
  if e.id is null or not exists (select 1 from public.team_members where team_id = e.team_id and user_id = uid) then
    raise exception 'No eres del equipo' using errcode = 'P0001', hint = 'not_member';
  end if;
  if p_answer not in ('yes', 'maybe', 'no') then raise exception 'Respuesta no válida' using errcode = '22023', hint = 'invalid'; end if;
  insert into public.team_event_rsvps (event_id, user_id, answer) values (p_event, uid, p_answer)
  on conflict (event_id, user_id) do update set answer = excluded.answer, updated_at = now();
end $$;

create function private.delete_team_event(p_event uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.team_events e
  where e.id = p_event
    and (e.created_by = auth.uid() or exists (select 1 from public.teams t where t.id = e.team_id and t.owner_id = auth.uid()));
  if not found then raise exception 'Solo quien la propuso o el dueño' using errcode = '42501'; end if;
end $$;

-- Crear un grupo con los que van: quien lo crea es su dueño y entran los que respondieron «voy» (por orden de
-- respuesta, hasta llenar las plazas del modo). Cada uno recibe un aviso.
create function private.team_event_lobby(p_event uuid, p_mode text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); e record; t record; cap int; lid uuid; m record;
begin
  select * into e from public.team_events where id = p_event for update;
  if e.id is null then raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable'; end if;
  select * into t from public.teams where id = e.team_id;
  if uid is distinct from e.created_by and uid is distinct from t.owner_id then
    raise exception 'Solo quien la propuso o el dueño' using errcode = '42501';
  end if;
  if e.lobby_id is not null then raise exception 'Ya tiene grupo' using errcode = 'P0001', hint = 'duplicate'; end if;
  select party_size into cap from public.game_modes where game_id = t.game_id and slug = p_mode and active;
  if cap is null then raise exception 'Modo no válido' using errcode = '23514', hint = 'invalid'; end if;
  lid := private.create_lobby(t.game_id, p_mode, 'Quedada del equipo «' || t.name || '»', null, null, null, null, null,
    case when e.starts_at between now() - interval '1 hour' and now() + interval '14 days' then e.starts_at end, '{}');
  for m in
    select r.user_id from public.team_event_rsvps r
    join public.team_members tm on tm.team_id = e.team_id and tm.user_id = r.user_id
    where r.event_id = p_event and r.answer = 'yes' and r.user_id <> uid and private.restricted_until(r.user_id) is null
    order by r.updated_at
    limit cap - 1
  loop
    insert into public.lobby_members (lobby_id, user_id) values (lid, m.user_id) on conflict do nothing;
    perform private.notify_team(m.user_id, 'team_lobby', uid, e.team_id, lid, 'Grupo de la quedada de «' || t.name || '».');
  end loop;
  -- Estado del grupo (abierto/completo) según cuántos han entrado.
  perform private.lobby_refresh_status(lid);
  update public.team_events set lobby_id = lid where id = p_event;
  return lid;
end $$;

-- ===================================================================================================================
-- 4) Guía de bienvenida
-- ===================================================================================================================
alter table public.profiles add column onboarded_at timestamptz;
update public.profiles set onboarded_at = coalesce(created_at, now()) where onboarded_at is null;
grant update (onboarded_at) on public.profiles to authenticated;

-- ===================================================================================================================
-- 5) Notificaciones push
-- ===================================================================================================================
create table public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  endpoint text not null unique check (endpoint ~ '^https://' and char_length(endpoint) <= 1000),
  p256dh text not null check (char_length(p256dh) between 20 and 200),
  auth text not null check (char_length(auth) between 8 and 100),
  created_at timestamptz not null default now()
);
create index push_subscriptions_user on public.push_subscriptions (user_id);
alter table public.push_subscriptions enable row level security;
create policy "push own read" on public.push_subscriptions for select to authenticated using (user_id = (select auth.uid()));
create policy "push own insert" on public.push_subscriptions for insert to authenticated with check (user_id = (select auth.uid()));
create policy "push own delete" on public.push_subscriptions for delete to authenticated using (user_id = (select auth.uid()));
revoke update on public.push_subscriptions from authenticated;
revoke all on public.push_subscriptions from anon;

-- Pide a la web (/api/push) que envíe un push a los dispositivos de alguien. La web comprueba el secreto compartido
-- y firma con sus claves VAPID; sin secreto configurado no se hace nada.
create function private.push_notify(p_user uuid, p_title text, p_body text, p_url text) returns void
language plpgsql security definer set search_path = '' as $$
declare
  secret text := (select value from private.app_settings where key = 'push_webhook_secret');
  target text := coalesce((select value from private.app_settings where key = 'push_endpoint'),
                          coalesce((select value from private.app_settings where key = 'site_url'), 'https://teamfinder-seven.vercel.app') || '/api/push');
  subs jsonb;
begin
  if secret is null then return; end if;
  select jsonb_agg(jsonb_build_object('endpoint', s.endpoint, 'keys', jsonb_build_object('p256dh', s.p256dh, 'auth', s.auth)))
  into subs from public.push_subscriptions s where s.user_id = p_user;
  if subs is null then return; end if;
  perform net.http_post(
    url := target,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-push-secret', secret),
    body := jsonb_build_object('title', left(p_title, 80), 'body', left(coalesce(p_body, ''), 140), 'url', p_url, 'subscriptions', subs)
  );
end $$;

create function private.on_notification_push() returns trigger
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
      else 'Tienes un aviso nuevo' end,
    new.body,
    case
      when new.lobby_id is not null then '/grupos/' || new.lobby_id
      when new.clip_id is not null then '/clips/' || new.clip_id
      when new.team_id is not null then '/equipo/' || new.team_id
      else '/notificaciones' end);
  return new;
end $$;
create trigger notifications_push after insert on public.notifications
  for each row execute function private.on_notification_push();

-- Mensajes privados: un push al empezar una racha (no por cada mensaje si se escriben seguidos).
create function private.on_direct_message_push() returns trigger
language plpgsql security definer set search_path = '' as $$
declare c record; recipient uuid;
begin
  select * into c from public.direct_conversations where id = new.conversation_id;
  recipient := case when c.user_a = new.sender_id then c.user_b else c.user_a end;
  if exists (
    select 1 from public.direct_messages m
    where m.conversation_id = new.conversation_id and m.sender_id = new.sender_id and m.id <> new.id
      and m.created_at > now() - interval '5 minutes'
  ) then return new; end if;
  perform private.push_notify(recipient, 'Mensaje privado nuevo', new.body, '/mensajes/' || new.conversation_id);
  return new;
end $$;
create trigger direct_messages_push after insert on public.direct_messages
  for each row execute function private.on_direct_message_push();

-- La web avisa de las suscripciones caducadas (el navegador las dio de baja) para borrarlas.
create function private.prune_push_subscriptions(p_secret text, p_endpoints text[]) returns int
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  if p_secret is null or p_secret is distinct from (select value from private.app_settings where key = 'push_webhook_secret') then
    raise exception 'No autorizado' using errcode = '42501';
  end if;
  delete from public.push_subscriptions where endpoint = any(coalesce(p_endpoints, '{}'));
  get diagnostics n = row_count;
  return n;
end $$;

-- ===================================================================================================================
-- Permisos y envoltorios invoker en `public` (regla: nada SECURITY DEFINER expuesto)
-- ===================================================================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'private.set_available(text, int, text)', 'private.available_now(text)', 'private.share_lobby(uuid)',
    'private.create_team_event(uuid, timestamptz, text)', 'private.rsvp_team_event(uuid, text)',
    'private.delete_team_event(uuid)', 'private.team_event_lobby(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
  -- Públicas (sin sesión): el contador agregado, el resumen de un grupo compartido y la limpieza de suscripciones.
  foreach f in array array['private.available_counts()', 'private.shared_lobby(uuid)', 'private.prune_push_subscriptions(text, text[])'] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;
revoke execute on function private.notify_team(uuid, public.notification_kind, uuid, uuid, uuid, text),
  private.push_notify(uuid, text, text, text), private.on_notification_push(), private.on_direct_message_push()
  from public, anon, authenticated;

-- Las quedadas pasadas se borran a los 30 días.
create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare msgs int; reps int; logs int; notes int; restr int; mails int; events int;
begin
  delete from public.lobby_messages m
  using public.lobbies l
  where m.lobby_id = l.id and l.status = 'closed' and l.closed_at < now() - interval '30 days';
  get diagnostics msgs = row_count;

  delete from public.reports
  where status <> 'open'
    and coalesce(resolution, '') not like '[retener]%'
    and reviewed_at < now() - case when status = 'dismissed' then interval '6 months' else interval '12 months' end;
  get diagnostics reps = row_count;

  delete from public.moderation_log where created_at < now() - interval '12 months';
  get diagnostics logs = row_count;

  delete from public.notifications where created_at < now() - interval '60 days';
  get diagnostics notes = row_count;

  delete from public.user_restrictions where coalesce(lifted_at, until) < now() - interval '12 months';
  get diagnostics restr = row_count;

  delete from private.email_log where sent_at < now() - interval '30 days';
  get diagnostics mails = row_count;

  delete from public.team_events where starts_at < now() - interval '30 days';
  get diagnostics events = row_count;

  return jsonb_build_object('messages', msgs, 'reports', reps, 'moderation_log', logs, 'notifications', notes,
    'restrictions', restr, 'emails', mails, 'team_events', events);
end $$;
