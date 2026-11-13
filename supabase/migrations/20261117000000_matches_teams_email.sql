-- Tres funciones del prompt que faltaban:
-- 1) Registro manual de partidas (§4.6): mientras no haya integración oficial, cada cual apunta sus partidas, siempre
--    marcadas como «introducido manualmente». No cuentan para ningún ranking ni rating (§5.2).
-- 2) Equipos persistentes (§13 P2): equipo por juego con dueño, invitaciones, miembros (máx. 10) y chat propio.
-- 3) Avisos por correo (alcance de notificaciones, §14): resumen opcional (opt-in) con Brevo, como mucho uno por hora
--    y 250 al día en total (plan gratuito: 300/día). La clave de la API la guarda el propietario en
--    `private.app_settings` (ver PROGRESS.md); sin clave no se envía nada.

alter type public.notification_kind add value if not exists 'team_invite';
alter type public.notification_kind add value if not exists 'team_joined';

-- ===================================================================================================================
-- 1) Partidas introducidas a mano
-- ===================================================================================================================

-- Mapas como datos de configuración (sugerencias del formulario). VALORANT desde valorant-api.com (los mismos datos
-- que agentes y rangos); CS2 y Apex sin lista verificada: el mapa se escribe a mano.
create table public.game_maps (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id) on delete cascade,
  slug text not null check (slug ~ '^[a-z0-9-]{2,32}$'),
  name text not null check (char_length(name) between 1 and 40),
  sort smallint not null default 0,
  active boolean not null default true,
  unique (game_id, slug)
);
alter table public.game_maps enable row level security;
create policy "maps read" on public.game_maps for select to anon, authenticated using (active);
revoke insert, update, delete on public.game_maps from anon, authenticated;

insert into public.game_maps (game_id, slug, name, sort) values
  ('valorant', 'abyss', 'Abyss', 1), ('valorant', 'ascent', 'Ascent', 2), ('valorant', 'bind', 'Bind', 3),
  ('valorant', 'breeze', 'Breeze', 4), ('valorant', 'corrode', 'Corrode', 5), ('valorant', 'fracture', 'Fracture', 6),
  ('valorant', 'haven', 'Haven', 7), ('valorant', 'icebox', 'Icebox', 8), ('valorant', 'lotus', 'Lotus', 9),
  ('valorant', 'pearl', 'Pearl', 10), ('valorant', 'split', 'Split', 11), ('valorant', 'summit', 'Summit', 12),
  ('valorant', 'sunset', 'Sunset', 13),
  ('valorant', 'district', 'District', 20), ('valorant', 'drift', 'Drift', 21), ('valorant', 'glitch', 'Glitch', 22),
  ('valorant', 'kasbah', 'Kasbah', 23), ('valorant', 'piazza', 'Piazza', 24);

alter table public.profiles add column matches_visibility public.visibility not null default 'private';
grant update (matches_visibility) on public.profiles to authenticated;

create type public.match_result as enum ('win', 'loss', 'draw');

create table public.manual_matches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id),
  played_on date not null check (played_on >= date '2020-01-01'),
  mode_id uuid references public.game_modes (id) on delete set null,
  map_name text check (map_name is null or (char_length(btrim(map_name)) between 1 and 40 and map_name !~ '[<>]')),
  character_id uuid references public.game_characters (id) on delete set null,
  result public.match_result,
  placement smallint check (placement between 1 and 60),
  kills smallint check (kills between 0 and 200),
  deaths smallint check (deaths between 0 and 200),
  assists smallint check (assists between 0 and 200),
  note text check (note is null or (char_length(note) <= 200 and note !~ '[<>]')),
  created_at timestamptz not null default now()
);
create index manual_matches_user on public.manual_matches (user_id, game_id, played_on desc);
create index manual_matches_game on public.manual_matches (game_id);
create index manual_matches_mode on public.manual_matches (mode_id);
create index manual_matches_character on public.manual_matches (character_id);

-- Visibilidad de las partidas de alguien (la tabla de perfiles no se puede leer entera desde la API).
create function private.matches_visible(p_owner uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) = p_owner
    or (not private.blocked_with(p_owner)
        and public.can_see(p_owner, (select matches_visibility from public.profiles where id = p_owner)));
$$;
grant execute on function private.matches_visible(uuid) to anon, authenticated;

-- Coherencia: el modo y el personaje son del mismo juego; fecha no futura; como mucho 30 al día.
create function private.check_manual_match() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.mode_id is not null and not exists (select 1 from public.game_modes where id = new.mode_id and game_id = new.game_id) then
    raise exception 'Modo no válido' using errcode = '23514', hint = 'invalid';
  end if;
  if new.character_id is not null and not exists (select 1 from public.game_characters where id = new.character_id and game_id = new.game_id) then
    raise exception 'Personaje no válido' using errcode = '23514', hint = 'invalid';
  end if;
  if new.played_on > (now() at time zone 'Europe/Madrid')::date then
    raise exception 'Fecha futura' using errcode = '23514', hint = 'invalid';
  end if;
  if (select count(*) from public.manual_matches where user_id = new.user_id and created_at > now() - interval '1 day') >= 30 then
    raise exception 'Demasiadas partidas hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  return new;
end $$;
create trigger manual_matches_check before insert on public.manual_matches
  for each row execute function private.check_manual_match();
revoke execute on function private.check_manual_match() from public, anon, authenticated;

alter table public.manual_matches enable row level security;
create policy "matches read" on public.manual_matches for select to anon, authenticated
  using (private.matches_visible(user_id));
create policy "matches insert own" on public.manual_matches for insert to authenticated
  with check (user_id = (select auth.uid()));
create policy "matches delete own" on public.manual_matches for delete to authenticated
  using (user_id = (select auth.uid()));
revoke update on public.manual_matches from anon, authenticated;
revoke insert, delete on public.manual_matches from anon;

-- ===================================================================================================================
-- 2) Equipos persistentes
-- ===================================================================================================================
create table public.teams (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id),
  name text not null check (char_length(btrim(name)) between 3 and 32 and name !~ '[<>]'),
  description text check (description is null or (char_length(description) <= 200 and description !~ '[<>]')),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
create unique index teams_name_unique on public.teams (game_id, lower(btrim(name)));
create index teams_owner on public.teams (owner_id);

create table public.team_members (
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  role text not null default 'member' check (role in ('owner', 'member')),
  joined_at timestamptz not null default now(),
  primary key (team_id, user_id)
);
create index team_members_user on public.team_members (user_id);

create table public.team_invites (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  invited_by uuid references public.profiles (id) on delete set null,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default now(),
  responded_at timestamptz
);
create unique index team_invites_pending on public.team_invites (team_id, user_id) where status = 'pending';
create index team_invites_user on public.team_invites (user_id, status);
create index team_invites_by on public.team_invites (invited_by);

create table public.team_messages (
  id bigint generated always as identity primary key,
  team_id uuid not null references public.teams (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index team_messages_team on public.team_messages (team_id, id desc);
create index team_messages_user on public.team_messages (user_id, created_at desc);

create function private.is_team_member(p_team uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.team_members where team_id = p_team and user_id = (select auth.uid()));
$$;
grant execute on function private.is_team_member(uuid) to authenticated;

alter table public.teams enable row level security;
alter table public.team_members enable row level security;
alter table public.team_invites enable row level security;
alter table public.team_messages enable row level security;
-- Nombre, descripción y miembros de un equipo los ve cualquiera con sesión (como un grupo); el chat, solo el equipo.
create policy "teams read" on public.teams for select to authenticated using (true);
create policy "team members read" on public.team_members for select to authenticated using (true);
create policy "team invites read" on public.team_invites for select to authenticated
  using (user_id = (select auth.uid()) or private.is_team_member(team_id));
create policy "team messages read" on public.team_messages for select to authenticated
  using (private.is_team_member(team_id));
revoke all on public.teams, public.team_members, public.team_invites, public.team_messages from anon;
revoke insert, update, delete on public.teams, public.team_members, public.team_invites, public.team_messages
  from authenticated;

create trigger teams_restricted before insert on public.teams
  for each row execute function private.block_if_restricted('owner_id');
create trigger team_messages_restricted before insert on public.team_messages
  for each row execute function private.block_if_restricted('user_id');

create function private.team_size(p_team uuid) returns int
language sql stable security definer set search_path = '' as $$
  select (select count(*) from public.team_members where team_id = p_team)::int
       + (select count(*) from public.team_invites where team_id = p_team and status = 'pending')::int;
$$;

create function private.create_team(p_game text, p_name text, p_description text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); tid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if not exists (select 1 from public.games where id = p_game and active) then
    raise exception 'Juego no válido' using errcode = '23514', hint = 'invalid';
  end if;
  if (select count(*) from public.teams where owner_id = uid) >= 3 then
    raise exception 'Ya tienes 3 equipos' using errcode = 'P0001', hint = 'limit_teams';
  end if;
  if exists (select 1 from public.teams where game_id = p_game and lower(btrim(name)) = lower(btrim(p_name))) then
    raise exception 'Nombre en uso' using errcode = 'P0001', hint = 'duplicate';
  end if;
  insert into public.teams (game_id, name, description, owner_id)
  values (p_game, btrim(p_name), nullif(btrim(p_description), ''), uid) returning id into tid;
  insert into public.team_members (team_id, user_id, role) values (tid, uid, 'owner');
  return tid;
end $$;

create function private.update_team(p_team uuid, p_name text, p_description text) returns void
language plpgsql security definer set search_path = '' as $$
declare t record;
begin
  select * into t from public.teams where id = p_team and owner_id = auth.uid();
  if t.id is null then raise exception 'Solo el dueño' using errcode = '42501'; end if;
  if exists (select 1 from public.teams where game_id = t.game_id and id <> t.id and lower(btrim(name)) = lower(btrim(p_name))) then
    raise exception 'Nombre en uso' using errcode = 'P0001', hint = 'duplicate';
  end if;
  update public.teams set name = btrim(p_name), description = nullif(btrim(p_description), '') where id = p_team;
end $$;

create function private.invite_to_team(p_team uuid, p_user uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); t record; iid uuid;
begin
  select * into t from public.teams where id = p_team and owner_id = uid;
  if t.id is null then raise exception 'Solo el dueño' using errcode = '42501'; end if;
  if p_user = uid then raise exception 'No contigo' using errcode = 'P0001', hint = 'self'; end if;
  if not exists (select 1 from public.profiles where id = p_user) or private.blocked_with(p_user) then
    raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable';
  end if;
  if exists (select 1 from public.team_members where team_id = p_team and user_id = p_user) then
    raise exception 'Ya es del equipo' using errcode = 'P0001', hint = 'already_member';
  end if;
  if exists (select 1 from public.team_invites where team_id = p_team and user_id = p_user and status = 'pending') then
    raise exception 'Ya invitado' using errcode = 'P0001', hint = 'duplicate';
  end if;
  if private.team_size(p_team) >= 10 then raise exception 'Equipo lleno' using errcode = 'P0001', hint = 'full'; end if;
  if (select count(*) from public.team_invites where invited_by = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Demasiadas invitaciones hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.team_invites (team_id, user_id, invited_by) values (p_team, p_user, uid) returning id into iid;
  perform private.notify(p_user, 'team_invite', uid, null, null, 'Te invitan al equipo «' || t.name || '».');
  return iid;
end $$;

create function private.respond_team_invite(p_invite uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); i record; t record;
begin
  select * into i from public.team_invites where id = p_invite and user_id = uid for update;
  if i.id is null or i.status <> 'pending' then raise exception 'No pendiente' using errcode = 'P0001', hint = 'not_pending'; end if;
  select * into t from public.teams where id = i.team_id;
  if p_accept and private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida temporalmente' using errcode = 'P0001', hint = 'restricted';
  end if;
  if p_accept and (select count(*) from public.team_members where team_id = i.team_id) >= 10 then
    raise exception 'Equipo lleno' using errcode = 'P0001', hint = 'full';
  end if;
  update public.team_invites set status = case when p_accept then 'accepted' else 'declined' end, responded_at = now()
  where id = p_invite;
  if p_accept then
    insert into public.team_members (team_id, user_id) values (i.team_id, uid) on conflict do nothing;
    perform private.notify(t.owner_id, 'team_joined', uid, null, null, 'Nuevo miembro en «' || t.name || '».');
  end if;
end $$;

create function private.cancel_team_invite(p_invite uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.team_invites i set status = 'cancelled', responded_at = now()
  where i.id = p_invite and i.status = 'pending'
    and exists (select 1 from public.teams t where t.id = i.team_id and t.owner_id = auth.uid());
  if not found then raise exception 'No se puede cancelar' using errcode = '42501'; end if;
end $$;

-- Salir del equipo (quien no es dueño) o, si es el dueño, echar a alguien.
create function private.leave_team(p_team uuid, p_user uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid := coalesce(p_user, auth.uid()); t record;
begin
  select * into t from public.teams where id = p_team;
  if t.id is null then raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable'; end if;
  if target = t.owner_id then raise exception 'El dueño borra el equipo' using errcode = 'P0001', hint = 'owner'; end if;
  if target <> uid and t.owner_id <> uid then raise exception 'Solo el dueño' using errcode = '42501'; end if;
  delete from public.team_members where team_id = p_team and user_id = target;
end $$;

create function private.delete_team(p_team uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.teams where id = p_team and owner_id = auth.uid();
  if not found then raise exception 'Solo el dueño' using errcode = '42501'; end if;
end $$;

create function private.send_team_message(p_team uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); body text := btrim(coalesce(p_body, '')); mid bigint;
begin
  if not exists (select 1 from public.team_members where team_id = p_team and user_id = uid) then
    raise exception 'No eres del equipo' using errcode = 'P0001', hint = 'not_member';
  end if;
  if char_length(body) not between 1 and 500 then raise exception 'Mensaje no válido' using errcode = '22023', hint = 'invalid'; end if;
  if (select count(*) from public.team_messages where user_id = uid and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Demasiado rápido' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.team_messages (team_id, user_id, body) values (p_team, uid, body) returning id into mid;
  return mid;
end $$;

-- Permisos y envoltorios invoker en `public` (regla: nada SECURITY DEFINER expuesto).
do $$
declare f text;
begin
  foreach f in array array[
    'private.create_team(text, text, text)', 'private.update_team(uuid, text, text)',
    'private.invite_to_team(uuid, uuid)', 'private.respond_team_invite(uuid, boolean)',
    'private.cancel_team_invite(uuid)', 'private.leave_team(uuid, uuid)', 'private.delete_team(uuid)',
    'private.send_team_message(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;
revoke execute on function private.team_size(uuid) from public, anon, authenticated;

alter publication supabase_realtime add table public.team_messages;

-- Mensajes de equipo: el chat se borra con el equipo; se pueden denunciar como los de las salas.
alter table public.reports add column team_message_id bigint references public.team_messages (id) on delete set null;
create index reports_team_message_id_fk on public.reports (team_message_id);
create function private.report_team_message(p_message bigint, p_reason public.report_reason, p_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m record; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Demasiadas denuncias hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  select tm.* into m from public.team_messages tm
  where tm.id = p_message and exists (select 1 from public.team_members x where x.team_id = tm.team_id and x.user_id = uid);
  if m.id is null or m.user_id = uid then raise exception 'Mensaje no válido' using errcode = 'P0001', hint = 'invalid'; end if;
  insert into public.reports (reporter_id, target_user_id, team_message_id, message_snapshot, reason, details)
  values (uid, m.user_id, m.id, m.body, p_reason, nullif(btrim(p_details), ''))
  returning id into rid;
  return rid;
end $$;
revoke execute on function private.report_team_message(bigint, public.report_reason, text) from public, anon;
grant execute on function private.report_team_message(bigint, public.report_reason, text) to authenticated;
select private.expose_function('private.report_team_message(bigint, public.report_reason, text)'::regprocedure);

-- ===================================================================================================================
-- 3) Avisos por correo (resumen, opt-in)
-- ===================================================================================================================
alter table public.profiles add column email_notifications boolean not null default false;
grant update (email_notifications) on public.profiles to authenticated;

create table private.email_log (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  sent_at timestamptz not null default now(),
  items int not null
);
create index email_log_user on private.email_log (user_id, sent_at desc);
create index email_log_sent on private.email_log (sent_at);
revoke all on private.email_log from public, anon, authenticated;

create function private.html_escape(p text) returns text
language sql immutable set search_path = '' as $$
  select replace(replace(replace(replace(coalesce(p, ''), '&', '&amp;'), '<', '&lt;'), '>', '&gt;'), '"', '&quot;');
$$;

-- Cada 15 minutos: a quien tiene los avisos por correo activados y novedades sin leer desde el último correo (de hace
-- más de 5 minutos, por si ya las ha visto en la web), un único correo con el recuento y el enlace. Sin nombres ni
-- textos de otras personas. Como mucho uno por hora y persona, y 250 al día en total.
create function private.send_email_digests() returns text
language plpgsql security definer set search_path = '' as $$
declare
  api_key text := (select value from private.app_settings where key = 'brevo_api_key');
  sender text := (select value from private.app_settings where key = 'email_sender');
  site text := coalesce((select value from private.app_settings where key = 'site_url'), 'https://teamfinder-seven.vercel.app');
  budget int;
  u record;
  sent int := 0;
  body_text text;
  subject text;
begin
  if api_key is null or sender is null or sender !~ '^[^@\s<>"]+@[^@\s<>"]+\.[^@\s<>"]+$' then
    return 'sin configurar';
  end if;
  budget := 250 - (select count(*) from private.email_log where sent_at > now() - interval '1 day')::int;
  if budget <= 0 then return 'límite diario'; end if;

  for u in
    with candidates as (
      select p.id, au.email,
        (select max(sent_at) from private.email_log l where l.user_id = p.id) as last_sent
      from public.profiles p
      join auth.users au on au.id = p.id
      where p.email_notifications and au.email is not null
    ),
    counted as (
      select c.*,
        (select count(*) from public.notifications n
          where n.user_id = c.id and n.read_at is null
            and n.created_at > coalesce(c.last_sent, '-infinity') and n.created_at < now() - interval '5 minutes')::int as notes,
        (select count(*) from public.direct_messages m
          join public.direct_conversations dc on dc.id = m.conversation_id
          left join public.direct_reads r on r.conversation_id = dc.id and r.user_id = c.id
          where c.id in (dc.user_a, dc.user_b) and m.sender_id <> c.id
            and m.id > coalesce(r.last_read_id, 0)
            and m.created_at > coalesce(c.last_sent, '-infinity') and m.created_at < now() - interval '5 minutes'
            and not exists (
              select 1 from public.user_blocks b
              where (b.blocker_id = c.id and b.blocked_id = m.sender_id) or (b.blocker_id = m.sender_id and b.blocked_id = c.id)
            ))::int as dms
      from candidates c
      where c.last_sent is null or c.last_sent < now() - interval '1 hour'
    )
    select * from counted where notes + dms > 0 order by id limit budget
  loop
    subject := 'Tienes novedades en TeamFinder';
    body_text := 'Hola: tienes '
      || case when u.notes > 0 then u.notes || ' aviso' || case when u.notes = 1 then '' else 's' end || ' nuevo' || case when u.notes = 1 then '' else 's' end else '' end
      || case when u.notes > 0 and u.dms > 0 then ' y ' else '' end
      || case when u.dms > 0 then u.dms || ' mensaje' || case when u.dms = 1 then '' else 's' end || ' privado' || case when u.dms = 1 then '' else 's' end || ' sin leer' else '' end
      || ' en TeamFinder.';
    perform net.http_post(
      url := 'https://api.brevo.com/v3/smtp/email',
      headers := jsonb_build_object('api-key', api_key, 'Content-Type', 'application/json', 'accept', 'application/json'),
      body := jsonb_build_object(
        'sender', jsonb_build_object('name', 'TeamFinder', 'email', sender),
        'to', jsonb_build_array(jsonb_build_object('email', u.email)),
        'subject', subject,
        'textContent', body_text || E'\n\nVer avisos: ' || site || E'/notificaciones\n\nPara dejar de recibir estos correos, desactívalos en ' || site || '/ajustes',
        'htmlContent', '<p>' || private.html_escape(body_text) || '</p><p><a href="' || private.html_escape(site) || '/notificaciones">Ver avisos</a></p>'
          || '<p style="color:#666;font-size:12px">Para dejar de recibir estos correos, desactívalos en <a href="'
          || private.html_escape(site) || '/ajustes">Ajustes</a>.</p>'
      )
    );
    insert into private.email_log (user_id, items) values (u.id, u.notes + u.dms);
    sent := sent + 1;
  end loop;
  return 'enviados: ' || sent;
end $$;
revoke execute on function private.send_email_digests() from public, anon, authenticated;
revoke execute on function private.html_escape(text) from public, anon, authenticated;

select cron.schedule('send-email-digests', '*/15 * * * *', 'select private.send_email_digests()');

-- El registro de envíos solo se guarda 30 días (ver /privacidad).
create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare msgs int; reps int; logs int; notes int; restr int; mails int;
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

  return jsonb_build_object('messages', msgs, 'reports', reps, 'moderation_log', logs, 'notifications', notes,
    'restrictions', restr, 'emails', mails);
end $$;
