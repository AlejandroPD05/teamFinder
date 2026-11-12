-- 1) Restricciones temporales (escala de sanciones de /normas): durante la restricción no se puede crear grupos, pedir
--    unirse, escribir en salas o en privado, publicar clips, comentar ni dar emblemas. Se aplican con triggers, así
--    cubren cualquier camino (funciones RPC presentes y futuras).
-- 2) Notificaciones dentro de la web: solicitudes a tus grupos, respuestas a tus solicitudes, comentarios en tus
--    clips, reconocimientos de karma y avisos de moderación.

-- ---------- Restricciones ----------
create table public.user_restrictions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  until timestamptz not null,
  reason text not null check (char_length(btrim(reason)) between 3 and 500),
  report_id uuid references public.reports (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  lifted_at timestamptz
);
create index user_restrictions_active on public.user_restrictions (user_id, until);
alter table public.user_restrictions enable row level security;
create policy "restrictions own or admin" on public.user_restrictions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.user_restrictions from anon;
revoke insert, update, delete on public.user_restrictions from authenticated;

create function private.restricted_until(p_user uuid) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select max(until) from public.user_restrictions
  where user_id = p_user and lifted_at is null and until > now();
$$;

-- El argumento es la columna con la autoría (user_id, owner_id, sender_id…). Se lee vía jsonb porque PL/pgSQL no
-- admite `new.<columna>` si la tabla no la tiene, ni siquiera en una rama que no se ejecuta.
create function private.block_if_restricted() returns trigger
language plpgsql security definer set search_path = '' as $$
declare who uuid := (to_jsonb(new) ->> tg_argv[0])::uuid;
begin
  if private.restricted_until(who) is not null then
    raise exception 'Cuenta restringida temporalmente' using errcode = 'P0001', hint = 'restricted';
  end if;
  return new;
end $$;

create trigger lobbies_restricted before insert on public.lobbies
  for each row execute function private.block_if_restricted('owner_id');
create trigger lobby_requests_restricted before insert on public.lobby_requests
  for each row execute function private.block_if_restricted('user_id');
create trigger lobby_messages_restricted before insert on public.lobby_messages
  for each row execute function private.block_if_restricted('user_id');
create trigger clips_restricted before insert on public.clips
  for each row execute function private.block_if_restricted('user_id');
create trigger clip_comments_restricted before insert on public.clip_comments
  for each row execute function private.block_if_restricted('user_id');
create trigger clip_votes_restricted before insert on public.clip_votes
  for each row execute function private.block_if_restricted('user_id');

-- Moderación: restringir N días (1–90) con motivo, o levantar la restricción. Queda en el registro de moderación.
create function public.restrict_user(p_user uuid, p_days int, p_reason text, p_report uuid default null) returns uuid
language plpgsql security definer set search_path = '' as $$
declare rid uuid;
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  if p_days not between 1 and 90 then raise exception 'Duración no válida' using errcode = '22023'; end if;
  if p_user = auth.uid() then raise exception 'No puedes restringirte' using errcode = 'P0001', hint = 'self'; end if;
  insert into public.user_restrictions (user_id, until, reason, report_id, created_by)
  values (p_user, now() + make_interval(days => p_days), btrim(p_reason), p_report, auth.uid())
  returning id into rid;
  insert into public.moderation_log (admin_id, report_id, action, note)
  values (auth.uid(), p_report, 'restrict_' || p_days || 'd:' || p_user, btrim(p_reason));
  return rid;
end $$;

create function public.lift_restriction(p_restriction uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  update public.user_restrictions set lifted_at = now() where id = p_restriction and lifted_at is null;
  insert into public.moderation_log (admin_id, action) values (auth.uid(), 'lift_restriction:' || p_restriction);
end $$;

revoke execute on function public.restrict_user, public.lift_restriction from public, anon;
grant execute on function public.restrict_user, public.lift_restriction to authenticated;
revoke execute on function private.restricted_until, private.block_if_restricted from public, anon, authenticated;

-- ---------- Notificaciones ----------
create type public.notification_kind as enum (
  'join_request', 'request_accepted', 'request_rejected', 'clip_comment', 'karma', 'restriction', 'fanart'
);

create table public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind public.notification_kind not null,
  actor_id uuid references public.profiles (id) on delete set null,
  lobby_id uuid references public.lobbies (id) on delete cascade,
  clip_id uuid references public.clips (id) on delete cascade,
  body text check (body is null or char_length(body) <= 300),
  created_at timestamptz not null default now(),
  read_at timestamptz
);
create index notifications_user on public.notifications (user_id, created_at desc);
create index notifications_unread on public.notifications (user_id) where read_at is null;
alter table public.notifications enable row level security;
create policy "notifications own" on public.notifications for select to authenticated
  using (user_id = (select auth.uid()));
revoke all on public.notifications from anon;
revoke insert, update, delete on public.notifications from authenticated;

-- Marcar como leídas (todas o una).
create function public.mark_notifications_read(p_id bigint default null) returns void
language sql security definer set search_path = '' as $$
  update public.notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and (p_id is null or id = p_id);
$$;
revoke execute on function public.mark_notifications_read from public, anon;
grant execute on function public.mark_notifications_read to authenticated;

-- Las notificaciones viejas no se guardan para siempre (ver /privacidad): 60 días. Las restricciones, 12 meses desde que
-- terminan (para ver reincidencias, como el registro de moderación).
create or replace function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare msgs int; reps int; logs int; notes int; restr int;
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

  return jsonb_build_object('messages', msgs, 'reports', reps, 'moderation_log', logs, 'notifications', notes,
    'restrictions', restr);
end $$;

create function private.notify(p_user uuid, p_kind public.notification_kind, p_actor uuid,
  p_lobby uuid default null, p_clip uuid default null, p_body text default null) returns void
language sql security definer set search_path = '' as $$
  insert into public.notifications (user_id, kind, actor_id, lobby_id, clip_id, body)
  select p_user, p_kind, p_actor, p_lobby, p_clip, left(p_body, 300)
  where p_user is not null and p_user is distinct from p_actor;
$$;

create function private.on_request_change() returns trigger
language plpgsql security definer set search_path = '' as $$
declare owner uuid;
begin
  select owner_id into owner from public.lobbies where id = new.lobby_id;
  if tg_op = 'INSERT' and new.status = 'pending' then
    perform private.notify(owner, 'join_request', new.user_id, new.lobby_id, null, new.message);
  elsif tg_op = 'UPDATE' and old.status = 'pending' and new.status in ('accepted', 'rejected') then
    perform private.notify(new.user_id,
      case new.status when 'accepted' then 'request_accepted'::public.notification_kind else 'request_rejected' end,
      owner, new.lobby_id);
  end if;
  return new;
end $$;
create trigger lobby_requests_notify after insert or update of status on public.lobby_requests
  for each row execute function private.on_request_change();

create function private.on_clip_comment() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify((select user_id from public.clips where id = new.clip_id), 'clip_comment', new.user_id,
    null, new.clip_id, new.body);
  return new;
end $$;
create trigger clip_comments_notify after insert on public.clip_comments
  for each row execute function private.on_clip_comment();

-- Karma: no se dice quién lo dio (igual que en el perfil).
create function private.on_karma() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.value > 0 then
    perform private.notify(new.target_id, 'karma', null, new.lobby_id);
  end if;
  return new;
end $$;
create trigger karma_votes_notify after insert on public.karma_votes
  for each row execute function private.on_karma();

create function private.on_restriction() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  perform private.notify(new.user_id, 'restriction', null, null, null,
    'Hasta el ' || to_char(new.until at time zone 'Europe/Madrid', 'DD/MM/YYYY HH24:MI') || '. Motivo: ' || new.reason);
  return new;
end $$;
create trigger user_restrictions_notify after insert on public.user_restrictions
  for each row execute function private.on_restriction();

revoke execute on function private.notify, private.on_request_change, private.on_clip_comment, private.on_karma,
  private.on_restriction from public, anon, authenticated;
