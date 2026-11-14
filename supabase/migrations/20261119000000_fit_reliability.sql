-- Mejoras (2026-11-13, segunda tanda):
-- 1) «Te pueden encajar»: jugadores sugeridos con motivos explícitos (rol que te falta, mismo servidor, horario,
--    rango cercano, idioma común). Sin puntuación: se ordena por cuántos motivos cumplen y se enseñan los motivos.
-- 2) Fiabilidad: datos objetivos de los últimos 90 días (grupos terminados frente a abandonados, respuesta a
--    solicitudes). Solo se muestran con datos suficientes. No es una sanción.
-- 3) Grupo en un clic: plantillas guardadas a partir de un grupo propio.
-- 4) Invitar amigos: enlace personal; quien entra con él queda como tu invitado (para invitarle a tus equipos).
-- 5) Tarjeta compartible del perfil (opt-in) con solo lo que ya es público.
-- 6) Buzón de sugerencias, visible para moderación y (si hay webhook) avisado en Discord sin datos de quien escribe.

alter type public.notification_kind add value if not exists 'friend_joined';

-- ===================================================================================================================
-- 1) Te pueden encajar
-- ===================================================================================================================
create function private.suggested_players(p_game text, p_limit int default 5)
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
      and (gp.updated_at > now() - interval '90 days' or gp.available_until > now())
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
-- 2) Fiabilidad
-- ===================================================================================================================
-- Salidas de un grupo antes de cerrarse (para «termina el X % de sus grupos»). Solo se guardan 90 días.
create table public.lobby_departures (
  id bigint generated always as identity primary key,
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  left_at timestamptz not null default now()
);
create index lobby_departures_user on public.lobby_departures (user_id, left_at);
create index lobby_departures_lobby on public.lobby_departures (lobby_id);
alter table public.lobby_departures enable row level security;
revoke all on public.lobby_departures from anon, authenticated;

create function private.on_member_leave() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Solo salidas voluntarias (leave_lobby): no cuenta si se borra la cuenta o el grupo.
  if exists (select 1 from public.lobbies l where l.id = old.lobby_id and l.status <> 'closed' and l.owner_id <> old.user_id)
     and exists (select 1 from public.profiles p where p.id = old.user_id) then
    insert into public.lobby_departures (lobby_id, user_id) values (old.lobby_id, old.user_id);
  end if;
  return old;
end $$;
create trigger lobby_members_leave after delete on public.lobby_members
  for each row execute function private.on_member_leave();
revoke execute on function private.on_member_leave() from public, anon, authenticated;

-- Cuándo respondió el creador a una solicitud. `decided_at` no sirve: al salir del grupo la solicitud aceptada pasa a
-- «withdrawn» y se sobrescribe.
alter table public.lobby_requests add column responded_at timestamptz;
update public.lobby_requests set responded_at = decided_at where status in ('accepted', 'rejected');
create index lobby_requests_lobby_responded on public.lobby_requests (lobby_id, created_at);

create function private.on_request_responded() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if old.status = 'pending' and new.status in ('accepted', 'rejected') then
    new.responded_at := now();
  else
    new.responded_at := old.responded_at;
  end if;
  return new;
end $$;
create trigger lobby_requests_responded before update on public.lobby_requests
  for each row execute function private.on_request_responded();
revoke execute on function private.on_request_responded() from public, anon, authenticated;

create function private.player_reliability(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  since timestamptz := now() - interval '90 days';
  finished int; left_count int; responded int; unanswered int; median_min numeric;
begin
  if auth.uid() is null or private.blocked_with(p_user) then return null; end if;
  select count(*) into finished
  from public.lobbies l join public.lobby_members m on m.lobby_id = l.id and m.user_id = p_user
  where l.status = 'closed' and l.filled_at is not null and l.closed_at > since;
  select count(*) into left_count from public.lobby_departures d where d.user_id = p_user and d.left_at > since;
  select count(*) filter (where r.responded_at is not null),
         count(*) filter (where r.status = 'pending' and (l.status = 'closed' or r.created_at < now() - interval '1 day')),
         percentile_cont(0.5) within group (order by extract(epoch from (r.responded_at - r.created_at)) / 60)
           filter (where r.responded_at is not null)
  into responded, unanswered, median_min
  from public.lobby_requests r join public.lobbies l on l.id = r.lobby_id
  where l.owner_id = p_user and r.created_at > since;
  return jsonb_build_object(
    'finished', finished,
    'left', left_count,
    'completion_pct', case when finished + left_count >= 3 then round(100.0 * finished / (finished + left_count)) end,
    'responded', responded,
    'response_pct', case when responded + unanswered >= 3 then round(100.0 * responded / (responded + unanswered)) end,
    'median_response_min', case when responded >= 3 then round(median_min) end
  );
end $$;

-- ===================================================================================================================
-- 3) Plantillas de grupo
-- ===================================================================================================================
create table public.lobby_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 2 and 40 and name !~ '[<>]'),
  mode_slug text not null,
  note text,
  rank_min_id uuid references public.game_ranks (id) on delete set null,
  rank_max_id uuid references public.game_ranks (id) on delete set null,
  region_id uuid references public.game_regions (id) on delete set null,
  language text,
  goal text,
  roles uuid[] not null default '{}',
  created_at timestamptz not null default now()
);
create index lobby_templates_user on public.lobby_templates (user_id, game_id);
create index lobby_templates_game on public.lobby_templates (game_id);
create index lobby_templates_rank_min on public.lobby_templates (rank_min_id);
create index lobby_templates_rank_max on public.lobby_templates (rank_max_id);
create index lobby_templates_region on public.lobby_templates (region_id);
alter table public.lobby_templates enable row level security;
create policy "templates own read" on public.lobby_templates for select to authenticated using (user_id = (select auth.uid()));
create policy "templates own delete" on public.lobby_templates for delete to authenticated using (user_id = (select auth.uid()));
revoke insert, update on public.lobby_templates from authenticated;
revoke all on public.lobby_templates from anon;

-- Guarda como plantilla un grupo tuyo (como mucho 5 por juego).
create function private.save_lobby_template(p_lobby uuid, p_name text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; tid uuid;
begin
  select * into l from public.lobbies where id = p_lobby and owner_id = uid;
  if l.id is null then raise exception 'Solo el creador' using errcode = '42501'; end if;
  if (select count(*) from public.lobby_templates where user_id = uid and game_id = l.game_id) >= 5 then
    raise exception 'Ya tienes 5 plantillas' using errcode = 'P0001', hint = 'limit_templates';
  end if;
  insert into public.lobby_templates (user_id, game_id, name, mode_slug, note, rank_min_id, rank_max_id, region_id, language, goal, roles)
  values (uid, l.game_id, btrim(p_name), l.mode_slug, l.note, l.rank_min_id, l.rank_max_id, l.region_id, l.language, l.goal,
    coalesce((select array_agg(role_id) from public.lobby_needed_roles where lobby_id = l.id), '{}'))
  returning id into tid;
  return tid;
end $$;

-- ===================================================================================================================
-- 4) Invitar amigos
-- ===================================================================================================================
alter table public.profiles
  add column invite_code text unique check (invite_code is null or invite_code ~ '^[a-z0-9]{8}$'),
  add column invited_by uuid references public.profiles (id) on delete set null;
create index profiles_invited_by on public.profiles (invited_by);

-- Tu código de invitación (se crea la primera vez).
create function private.my_invite_code() returns text
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); code text;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select invite_code into code from public.profiles where id = uid;
  while code is null loop
    code := lower(substr(translate(encode(extensions.gen_random_bytes(8), 'base64'), '+/=', ''), 1, 8));
    if code !~ '^[a-z0-9]{8}$' or exists (select 1 from public.profiles where invite_code = code) then
      code := null;
    else
      update public.profiles set invite_code = code where id = uid;
    end if;
  end loop;
  return code;
end $$;

-- Quién invita (para la página pública del enlace): solo el nombre visible, que ya es público.
create function private.invite_owner(p_code text) returns text
language sql stable security definer set search_path = '' as $$
  select display_name from public.profiles where invite_code = lower(p_code);
$$;

-- Al entrar con un enlace: si la cuenta es nueva (menos de 7 días) y aún no tiene quien la invitó, queda registrada.
create function private.accept_invite(p_code text) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); inviter uuid; created timestamptz;
begin
  if uid is null then return false; end if;
  select id into inviter from public.profiles where invite_code = lower(p_code);
  select created_at into created from auth.users where id = uid;
  if inviter is null or inviter = uid or created < now() - interval '7 days' or private.blocked_with(inviter) then return false; end if;
  update public.profiles set invited_by = inviter where id = uid and invited_by is null;
  if not found then return false; end if;
  perform private.notify(inviter, 'friend_joined', uid, null, null, null);
  return true;
end $$;

create function private.my_invitees() returns table (user_id uuid, joined_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select p.id, p.created_at from public.profiles p
  where p.invited_by = (select auth.uid()) and not private.blocked_with(p.id)
  order by p.created_at desc limit 50;
$$;

-- ===================================================================================================================
-- 5) Tarjeta compartible del perfil
-- ===================================================================================================================
alter table public.profiles add column share_card boolean not null default false;
grant update (share_card) on public.profiles to authenticated;

-- Datos de la tarjeta: solo si su dueño la activó y su perfil de ese juego es público.
create function private.public_player_card(p_user uuid, p_game text)
returns table (display_name text, avatar_url text, game_name text, rank_name text, rank_color text, region text,
  roles text[], primary_role text, mains text[], flex boolean)
language sql stable security definer set search_path = '' as $$
  select p.display_name, p.avatar_url, g.name, r.name, r.color, reg.name,
    coalesce((select array_agg(gr.name order by pr.is_primary desc, gr.sort) from public.player_roles pr
              join public.game_roles gr on gr.id = pr.role_id where pr.user_id = p.id and pr.game_id = p_game), '{}'),
    (select gr.name from public.player_roles pr join public.game_roles gr on gr.id = pr.role_id
      where pr.user_id = p.id and pr.game_id = p_game and pr.is_primary limit 1),
    coalesce((select array_agg(c.name order by c.name) from public.player_characters pc
              join public.game_characters c on c.id = pc.character_id
              where pc.user_id = p.id and pc.game_id = p_game and pc.status = 'main'), '{}'),
    gp.flex
  from public.profiles p
  join public.game_profiles gp on gp.user_id = p.id and gp.game_id = p_game and gp.visibility = 'public'
  join public.games g on g.id = p_game
  left join public.game_ranks r on r.id = gp.rank_id
  left join public.game_regions reg on reg.id = gp.region_id
  where p.id = p_user and p.share_card;
$$;

-- ===================================================================================================================
-- 6) Buzón de sugerencias
-- ===================================================================================================================
create table public.feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  kind text not null check (kind in ('idea', 'bug', 'other')),
  body text not null check (char_length(btrim(body)) between 10 and 1000),
  page text check (page is null or (char_length(page) <= 200 and page ~ '^/')),
  status text not null default 'new' check (status in ('new', 'done')),
  created_at timestamptz not null default now()
);
create index feedback_user on public.feedback (user_id, created_at);
create index feedback_status on public.feedback (status, created_at desc);
alter table public.feedback enable row level security;
create policy "feedback own or admin" on public.feedback for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke insert, update, delete on public.feedback from authenticated;
revoke all on public.feedback from anon;

create function private.send_feedback(p_kind text, p_body text, p_page text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); fid uuid;
  hook text := (select value from private.app_settings where key = 'feedback_webhook');
  label text;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida temporalmente' using errcode = 'P0001', hint = 'restricted';
  end if;
  if (select count(*) from public.feedback where user_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Demasiadas sugerencias hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.feedback (user_id, kind, body, page)
  values (uid, p_kind, btrim(p_body), nullif(btrim(coalesce(p_page, '')), '')) returning id into fid;
  -- Aviso en Discord (opcional): solo el tipo y el texto, sin quién lo escribe; sin menciones.
  if hook ~ '^https://(discord\.com|discordapp\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$' then
    label := case p_kind when 'idea' then 'Idea' when 'bug' then 'Error' else 'Otro' end;
    perform net.http_post(
      url := hook,
      body := jsonb_build_object('content', left('**Sugerencia (' || label || ')**' || coalesce(' en ' || nullif(btrim(coalesce(p_page, '')), ''), '') || E'\n' || btrim(p_body), 1900),
        'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
      headers := '{"Content-Type": "application/json"}'::jsonb
    );
  end if;
  return fid;
end $$;

create function private.set_feedback_status(p_id uuid, p_status text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  if p_status not in ('new', 'done') then raise exception 'Estado no válido' using errcode = '22023'; end if;
  update public.feedback set status = p_status where id = p_id;
end $$;

-- ===================================================================================================================
-- Permisos y envoltorios invoker en `public`
-- ===================================================================================================================
do $$
declare f text;
begin
  foreach f in array array[
    'private.suggested_players(text, int)', 'private.player_reliability(uuid)', 'private.save_lobby_template(uuid, text)',
    'private.my_invite_code()', 'private.accept_invite(text)', 'private.my_invitees()',
    'private.send_feedback(text, text, text)', 'private.set_feedback_status(uuid, text)'
  ] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
  foreach f in array array['private.invite_owner(text)', 'private.public_player_card(uuid, text)'] loop
    execute format('revoke execute on function %s from public', f);
    execute format('grant execute on function %s to anon, authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;

-- Plazos: salidas de grupos 90 días (la ventana de la fiabilidad) y sugerencias 12 meses.
create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare msgs int; reps int; logs int; notes int; restr int; mails int; events int; departures int; fb int;
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

  delete from public.lobby_departures where left_at < now() - interval '90 days';
  get diagnostics departures = row_count;

  delete from public.feedback where created_at < now() - interval '12 months';
  get diagnostics fb = row_count;

  return jsonb_build_object('messages', msgs, 'reports', reps, 'moderation_log', logs, 'notifications', notes,
    'restrictions', restr, 'emails', mails, 'team_events', events, 'departures', departures, 'feedback', fb);
end $$;
