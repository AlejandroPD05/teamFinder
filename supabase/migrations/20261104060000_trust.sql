-- Fase 6: bloqueo, denuncias, moderación, karma y borrado de cuenta.

-- ---------- Bloqueos ----------
create table public.user_blocks (
  blocker_id uuid not null references public.profiles (id) on delete cascade,
  blocked_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.user_blocks enable row level security;
create policy "blocks own" on public.user_blocks for select to authenticated using (blocker_id = (select auth.uid()));
revoke all on public.user_blocks from anon;
revoke insert, update, delete on public.user_blocks from authenticated;

-- ¿Hay bloqueo entre quien consulta y otro usuario (en cualquier sentido)?
create function public.blocked_with(other uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.user_blocks
    where (blocker_id = (select auth.uid()) and blocked_id = other)
       or (blocker_id = other and blocked_id = (select auth.uid()))
  )
$$;

create function public.block_user(p_user uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_user = auth.uid() then raise exception 'No puedes bloquearte' using errcode = 'P0001', hint = 'self'; end if;
  insert into public.user_blocks (blocker_id, blocked_id) values (auth.uid(), p_user) on conflict do nothing;
  -- Retira solicitudes pendientes cruzadas entre ambos.
  update public.lobby_requests r set status = 'withdrawn', decided_at = now()
  from public.lobbies l
  where r.lobby_id = l.id and r.status = 'pending'
    and ((r.user_id = auth.uid() and l.owner_id = p_user) or (r.user_id = p_user and l.owner_id = auth.uid()));
end $$;

create function public.unblock_user(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from public.user_blocks where blocker_id = (select auth.uid()) and blocked_id = p_user
$$;

-- Los bloqueados desaparecen: búsqueda y perfiles.
create or replace view public.player_search with (security_invoker = false) as
select
  p.id as user_id, gp.game_id, p.display_name, p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice end as voice,
  gp.rank_id, r.tier as rank_tier, gp.rank_source, gp.region_id, gp.flex, gp.mode_slugs,
  coalesce(roles.role_ids, '{}') as role_ids, roles.primary_role_id,
  coalesce(chars.character_ids, '{}') as character_ids, coalesce(chars.char_keys, '{}') as char_keys,
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
where public.can_see(gp.user_id, gp.visibility) and not public.blocked_with(p.id);

-- Grupos: no se ven los de alguien con quien hay bloqueo (salvo si ya eres miembro).
drop policy "lobbies read" on public.lobbies;
create policy "lobbies read" on public.lobbies for select to authenticated
  using ((status <> 'closed' and not public.blocked_with(owner_id)) or public.is_lobby_member(id));

-- Chat: no ves mensajes de quien has bloqueado.
drop policy "messages read members" on public.lobby_messages;
create policy "messages read members" on public.lobby_messages for select to authenticated
  using (public.is_lobby_member(lobby_id) and not exists (
    select 1 from public.user_blocks b where b.blocker_id = (select auth.uid()) and b.blocked_id = user_id));

-- Solicitar unirse a un grupo de alguien con bloqueo: no.
create or replace function public.request_join(p_lobby uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into l from public.lobbies where id = p_lobby for update;
  if l.id is null or l.status <> 'open' or public.blocked_with(l.owner_id) then
    raise exception 'El grupo no admite solicitudes' using errcode = 'P0001', hint = 'not_open';
  end if;
  if exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = uid) then
    raise exception 'Ya eres miembro' using errcode = 'P0001', hint = 'already_member';
  end if;
  if (select count(*) from public.lobby_requests where user_id = uid and status = 'pending') >= 10 then
    raise exception 'Demasiadas solicitudes pendientes' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.lobby_requests (lobby_id, user_id, message)
  values (p_lobby, uid, nullif(btrim(p_message), '')) returning id into rid;
  return rid;
exception when unique_violation then
  raise exception 'Ya tienes una solicitud en este grupo' using errcode = 'P0001', hint = 'duplicate';
end $$;

-- ---------- Moderación ----------
create table public.app_admins (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.app_admins enable row level security;
revoke all on public.app_admins from anon, authenticated;
-- Alta de moderadores solo por SQL (panel de Supabase): insert into public.app_admins (user_id) values ('…');

create function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.app_admins where user_id = (select auth.uid()))
$$;

create type public.report_reason as enum ('spam', 'harassment', 'sexual', 'impersonation', 'cheating', 'other');
create type public.report_status as enum ('open', 'actioned', 'dismissed');

create table public.reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles (id) on delete set null,
  target_user_id uuid references public.profiles (id) on delete set null,
  message_id bigint references public.lobby_messages (id) on delete set null,
  message_snapshot text, -- copia del mensaje denunciado (por si se borra la sala)
  lobby_id uuid references public.lobbies (id) on delete set null,
  reason public.report_reason not null,
  details text check (details is null or char_length(details) <= 500),
  status public.report_status not null default 'open',
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  resolution text check (resolution is null or char_length(resolution) <= 500)
);
create index reports_open on public.reports (status, created_at);
alter table public.reports enable row level security;
create policy "reports own or admin" on public.reports for select to authenticated
  using (reporter_id = (select auth.uid()) or public.is_admin());
revoke all on public.reports from anon;
revoke insert, update, delete on public.reports from authenticated;

create table public.moderation_log (
  id bigint generated always as identity primary key,
  admin_id uuid references public.profiles (id) on delete set null,
  report_id uuid references public.reports (id) on delete set null,
  action text not null,
  note text,
  created_at timestamptz not null default now()
);
alter table public.moderation_log enable row level security;
create policy "log admin" on public.moderation_log for select to authenticated using (public.is_admin());
revoke all on public.moderation_log from anon;
revoke insert, update, delete on public.moderation_log from authenticated;

create function public.report_user(
  p_target uuid, p_reason public.report_reason, p_details text, p_message bigint default null, p_lobby uuid default null
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); snap text; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_target = uid then raise exception 'No puedes denunciarte' using errcode = 'P0001', hint = 'self'; end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Demasiadas denuncias hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if p_message is not null then
    -- Solo se puede denunciar un mensaje que puedes ver (eres miembro de esa sala).
    select m.body into snap from public.lobby_messages m
    where m.id = p_message and m.user_id = p_target and public.is_lobby_member(m.lobby_id);
    if snap is null then raise exception 'Mensaje no válido' using errcode = 'P0001', hint = 'invalid'; end if;
  end if;
  insert into public.reports (reporter_id, target_user_id, message_id, message_snapshot, lobby_id, reason, details)
  values (uid, p_target, p_message, snap, p_lobby, p_reason, nullif(btrim(p_details), ''))
  returning id into rid;
  return rid;
end $$;

create function public.resolve_report(p_report uuid, p_status public.report_status, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  if p_status = 'open' then raise exception 'Estado no válido' using errcode = '22023'; end if;
  update public.reports set status = p_status, reviewed_by = auth.uid(), reviewed_at = now(),
    resolution = nullif(btrim(p_note), '') where id = p_report;
  insert into public.moderation_log (admin_id, report_id, action, note)
  values (auth.uid(), p_report, p_status::text, nullif(btrim(p_note), ''));
end $$;

-- ---------- Karma (reputación social, no sanción) ----------
alter table public.lobbies add column closed_at timestamptz;
create or replace function public.close_lobby(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.lobbies set status = 'closed', closed_at = now()
  where id = p_lobby and owner_id = auth.uid() and status <> 'closed';
  if not found then raise exception 'No se puede cerrar' using errcode = '42501'; end if;
  update public.lobby_requests set status = 'rejected', decided_at = now() where lobby_id = p_lobby and status = 'pending';
end $$;

create table public.karma_votes (
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  voter_id uuid not null references public.profiles (id) on delete cascade,
  target_id uuid not null references public.profiles (id) on delete cascade,
  value smallint not null check (value in (-1, 1)),
  tags text[] not null default '{}'
    check (cardinality(tags) <= 3 and tags <@ array['buen_companero','comunicativo','buen_ambiente','puntual','toxico','no_aparecio']),
  created_at timestamptz not null default now(),
  primary key (lobby_id, voter_id, target_id),
  check (voter_id <> target_id)
);
alter table public.karma_votes enable row level security;
create policy "votes own" on public.karma_votes for select to authenticated using (voter_id = (select auth.uid()));
revoke all on public.karma_votes from anon;
revoke insert, update, delete on public.karma_votes from authenticated;

-- Votar: miembros de un grupo cerrado, una vez por compañero, hasta 7 días tras el cierre.
create function public.vote_karma(p_lobby uuid, p_target uuid, p_value smallint, p_tags text[]) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into l from public.lobbies where id = p_lobby;
  if l.status is distinct from 'closed' or l.closed_at < now() - interval '7 days' then
    raise exception 'Solo en grupos cerrados (7 días)' using errcode = 'P0001', hint = 'not_closed';
  end if;
  if not exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = uid)
     or not exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = p_target) then
    raise exception 'Solo entre miembros' using errcode = '42501', hint = 'not_member';
  end if;
  insert into public.karma_votes (lobby_id, voter_id, target_id, value, tags)
  values (p_lobby, uid, p_target, p_value, coalesce(p_tags, '{}'));
exception when unique_violation then
  raise exception 'Ya has valorado a esta persona en este grupo' using errcode = 'P0001', hint = 'duplicate';
end $$;

-- Agregado público: totales y etiquetas más repetidas. Sin votos individuales ni quién votó.
create function public.karma_summary(p_user uuid) returns table (positives bigint, negatives bigint, top_tags text[])
language sql stable security definer set search_path = '' as $$
  select
    count(*) filter (where value = 1),
    count(*) filter (where value = -1),
    coalesce((select array_agg(t order by n desc, t) from (
       select t, count(*) n from public.karma_votes, unnest(tags) t where target_id = p_user group by t order by n desc, t limit 3
     ) s), '{}')
  from public.karma_votes where target_id = p_user
$$;

-- ---------- Borrado de cuenta ----------
-- Borra el usuario de auth: en cascada se van perfil, perfiles de juego, grupos propios, mensajes, votos y bloqueos.
-- Las denuncias se conservan anonimizadas (reporter/target pasan a null) para la moderación.
create function public.delete_my_account() returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  delete from auth.users where id = uid;
end $$;

revoke execute on function public.blocked_with, public.block_user, public.unblock_user, public.is_admin,
  public.report_user, public.resolve_report, public.vote_karma, public.karma_summary, public.delete_my_account
  from public, anon;
grant execute on function public.blocked_with, public.block_user, public.unblock_user, public.is_admin,
  public.report_user, public.resolve_report, public.vote_karma, public.karma_summary, public.delete_my_account
  to authenticated;
