-- Lista de espera en grupos llenos y quedadas de equipo que se repiten cada semana.

alter type public.notification_kind add value if not exists 'waitlist_open';

-- ===================================================================================================================
-- 1) Lista de espera
-- ===================================================================================================================
-- En un grupo lleno, cualquiera que podría pedir unirse se apunta. Cuando se libera una plaza, se avisa a todos los que
-- esperan (aviso `waitlist_open`) y la lista se vacía: es un aviso, no una cola; quien llegue antes pide unirse.
create table public.lobby_waitlist (
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);
create index lobby_waitlist_user on public.lobby_waitlist (user_id);
alter table public.lobby_waitlist enable row level security;
revoke all on public.lobby_waitlist from anon, authenticated;
grant select on public.lobby_waitlist to authenticated;
-- Cada uno ve solo sus esperas; ni el creador del grupo ve quién espera.
create policy "own waitlist entries" on public.lobby_waitlist for select to authenticated using (user_id = (select auth.uid()));

create function private.join_waitlist(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into l from public.lobbies where id = p_lobby;
  if l.id is null or private.blocked_with(l.owner_id) then
    raise exception 'El grupo no admite solicitudes' using errcode = 'P0001', hint = 'not_open';
  end if;
  if l.status <> 'full' then raise exception 'El grupo no está lleno' using errcode = 'P0001', hint = 'not_full'; end if;
  if l.owner_id = uid or exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = uid) then
    raise exception 'Ya eres miembro' using errcode = 'P0001', hint = 'already_member';
  end if;
  if private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida' using errcode = 'P0001', hint = 'restricted';
  end if;
  if (select count(*) from public.lobby_waitlist where user_id = uid) >= 10 then
    raise exception 'Demasiadas esperas' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.lobby_waitlist (lobby_id, user_id) values (p_lobby, uid) on conflict do nothing;
end $$;

create function private.leave_waitlist(p_lobby uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.lobby_waitlist where lobby_id = p_lobby and user_id = (select auth.uid());
$$;

create function private.on_lobby_status_waitlist() returns trigger
language plpgsql security definer set search_path = '' as $$
declare w record;
begin
  if new.status = 'open' and old.status = 'full' then
    for w in
      delete from public.lobby_waitlist where lobby_id = new.id returning user_id
    loop
      if not exists (
        select 1 from public.user_blocks b
        where (b.blocker_id = w.user_id and b.blocked_id = new.owner_id) or (b.blocker_id = new.owner_id and b.blocked_id = w.user_id)
      ) then
        perform private.notify(w.user_id, 'waitlist_open', null, new.id, null, null);
      end if;
    end loop;
  elsif new.status = 'closed' then
    delete from public.lobby_waitlist where lobby_id = new.id;
  end if;
  return null;
end $$;
create trigger lobby_status_waitlist after update of status on public.lobbies
for each row when (old.status is distinct from new.status) execute function private.on_lobby_status_waitlist();

-- ===================================================================================================================
-- 2) Quedadas que se repiten cada semana
-- ===================================================================================================================
-- Al empezar una quedada semanal se crea la de la semana siguiente (misma hora, misma nota) y se avisa al equipo.
-- Quien la propuso o el dueño del equipo pueden dejar de repetirla.
alter table public.team_events
  add column repeat_weekly boolean not null default false,
  add column repeated boolean not null default false;

drop function public.create_team_event(uuid, timestamptz, text);
drop function private.create_team_event(uuid, timestamptz, text);
create function private.create_team_event(p_team uuid, p_starts_at timestamptz, p_note text, p_repeat boolean default false)
returns uuid
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
  insert into public.team_events (team_id, created_by, starts_at, note, repeat_weekly)
  values (p_team, uid, p_starts_at, nullif(btrim(p_note), ''), coalesce(p_repeat, false)) returning id into eid;
  insert into public.team_event_rsvps (event_id, user_id, answer) values (eid, uid, 'yes');
  for m in select user_id from public.team_members where team_id = p_team and user_id <> uid loop
    perform private.notify_team(m.user_id, 'team_event', uid, p_team, null,
      '«' || t.name || '»: ' || to_char(p_starts_at at time zone 'Europe/Madrid', 'DD/MM "a las" HH24:MI')
      || case when p_repeat then ' (cada semana)' else '' end
      || coalesce(' · ' || nullif(btrim(p_note), ''), ''));
  end loop;
  return eid;
end $$;

create function private.stop_team_event_repeat(p_event uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.team_events e set repeat_weekly = false
  where e.id = p_event
    and (e.created_by = auth.uid() or exists (select 1 from public.teams t where t.id = e.team_id and t.owner_id = auth.uid()));
  if not found then raise exception 'Solo quien la propuso o el dueño' using errcode = '42501'; end if;
end $$;

-- Cada hora (pg_cron): crea la siguiente de las semanales que ya han empezado. Si quien la propuso ya no está en el
-- equipo, deja de repetirse.
create function private.roll_team_events() returns int
language plpgsql security definer set search_path = '' as $$
declare e record; t record; m record; next_at timestamptz; eid uuid; n int := 0;
begin
  for e in
    select * from public.team_events
    where repeat_weekly and not repeated and starts_at <= now()
    for update skip locked
  loop
    update public.team_events set repeated = true where id = e.id;
    if e.created_by is null or not exists (select 1 from public.team_members where team_id = e.team_id and user_id = e.created_by) then
      continue;
    end if;
    next_at := e.starts_at + interval '7 days';
    while next_at <= now() loop next_at := next_at + interval '7 days'; end loop;
    if (select count(*) from public.team_events where team_id = e.team_id and starts_at > now()) >= 5 then continue; end if;
    select * into t from public.teams where id = e.team_id;
    insert into public.team_events (team_id, created_by, starts_at, note, repeat_weekly)
    values (e.team_id, e.created_by, next_at, e.note, true) returning id into eid;
    insert into public.team_event_rsvps (event_id, user_id, answer) values (eid, e.created_by, 'yes');
    for m in select user_id from public.team_members where team_id = e.team_id and user_id <> e.created_by loop
      perform private.notify_team(m.user_id, 'team_event', e.created_by, e.team_id, null,
        '«' || t.name || '»: ' || to_char(next_at at time zone 'Europe/Madrid', 'DD/MM "a las" HH24:MI') || ' (cada semana)'
        || coalesce(' · ' || e.note, ''));
    end loop;
    n := n + 1;
  end loop;
  return n;
end $$;
revoke execute on function private.roll_team_events() from public, anon, authenticated;
select cron.schedule('roll-team-events', '7 * * * *', 'select private.roll_team_events()');

-- ===================================================================================================================
-- Avisos push y permisos
-- ===================================================================================================================
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
      when 'waitlist_open' then 'Se ha liberado una plaza en un grupo'
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

revoke execute on function private.on_lobby_status_waitlist() from public, anon, authenticated;
do $$
declare f text;
begin
  foreach f in array array['private.join_waitlist(uuid)', 'private.leave_waitlist(uuid)',
    'private.create_team_event(uuid, timestamptz, text, boolean)', 'private.stop_team_event_repeat(uuid)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;
