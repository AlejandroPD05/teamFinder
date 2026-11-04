-- Fase 4: grupos («busco dúo/trío/five») y solicitudes para unirse.
-- Toda escritura pasa por funciones que bloquean la fila del grupo: plazas y estados siempre consistentes.

create type public.lobby_status as enum ('open', 'full', 'closed');
create type public.request_status as enum ('pending', 'accepted', 'rejected', 'withdrawn');

create table public.lobbies (
  id uuid primary key default gen_random_uuid(),
  game_id text not null references public.games (id),
  owner_id uuid not null references public.profiles (id) on delete cascade,
  mode_slug text not null,
  slots smallint not null check (slots between 2 and 10),
  note text check (note is null or char_length(note) <= 140),
  rank_min_id uuid references public.game_ranks (id),
  rank_max_id uuid references public.game_ranks (id),
  region_id uuid references public.game_regions (id),
  language text check (language is null or language in ('es','en','pt','fr','de','it','ca','eu','gl')),
  goal text check (goal is null or goal in ('ranked','casual','improve','fun','meet')),
  starts_at timestamptz, -- null = «ahora»
  status public.lobby_status not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index lobbies_open on public.lobbies (game_id, status, created_at desc);

create table public.lobby_needed_roles (
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  role_id uuid not null references public.game_roles (id),
  primary key (lobby_id, role_id)
);

create table public.lobby_members (
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  joined_at timestamptz not null default now(),
  primary key (lobby_id, user_id)
);
create index lobby_members_user on public.lobby_members (user_id);

create table public.lobby_requests (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  message text check (message is null or char_length(message) <= 200),
  status public.request_status not null default 'pending',
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
-- Sin duplicados: como mucho una solicitud viva (pendiente o aceptada) por usuario y grupo.
create unique index lobby_requests_one_live on public.lobby_requests (lobby_id, user_id)
  where status in ('pending', 'accepted');
create index lobby_requests_user on public.lobby_requests (user_id, status);

create trigger lobbies_updated_at before update on public.lobbies
  for each row execute function public.set_updated_at();

-- ---------- RLS: lectura con sesión; escritura solo por funciones ----------
alter table public.lobbies enable row level security;
alter table public.lobby_needed_roles enable row level security;
alter table public.lobby_members enable row level security;
alter table public.lobby_requests enable row level security;

create function public.is_lobby_member(p_lobby uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = (select auth.uid()))
$$;

create policy "lobbies read" on public.lobbies for select to authenticated
  using (status <> 'closed' or public.is_lobby_member(id));
create policy "needed roles read" on public.lobby_needed_roles for select to authenticated using (true);
create policy "members read" on public.lobby_members for select to authenticated using (true);
-- Cada solicitud la ven quien la hace y el dueño del grupo.
create policy "requests read" on public.lobby_requests for select to authenticated
  using (user_id = (select auth.uid())
         or exists (select 1 from public.lobbies l where l.id = lobby_id and l.owner_id = (select auth.uid())));

revoke all on public.lobbies, public.lobby_needed_roles, public.lobby_members, public.lobby_requests from anon;
revoke insert, update, delete on public.lobbies, public.lobby_needed_roles, public.lobby_members, public.lobby_requests
  from authenticated;

-- ---------- Funciones ----------
create function public.lobby_refresh_status(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare n int; cap int; st public.lobby_status;
begin
  select slots, status into cap, st from public.lobbies where id = p_lobby;
  if st = 'closed' then return; end if;
  select count(*) into n from public.lobby_members where lobby_id = p_lobby;
  update public.lobbies set status = case when n >= cap then 'full'::public.lobby_status else 'open' end
  where id = p_lobby and status is distinct from (case when n >= cap then 'full'::public.lobby_status else 'open' end);
end $$;

create function public.create_lobby(
  p_game_id text, p_mode_slug text, p_note text, p_rank_min uuid, p_rank_max uuid,
  p_region uuid, p_language text, p_goal text, p_starts_at timestamptz, p_roles uuid[]
) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); cap int; new_id uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select party_size into cap from public.game_modes where game_id = p_game_id and slug = p_mode_slug and active;
  if cap is null then raise exception 'Modo no válido' using errcode = '23514'; end if;
  if (select count(*) from public.lobbies where owner_id = uid and status <> 'closed') >= 3 then
    raise exception 'Ya tienes 3 grupos abiertos' using errcode = 'P0001', hint = 'limit_lobbies';
  end if;
  if (select count(*) from public.lobbies where owner_id = uid and created_at > now() - interval '1 hour') >= 10 then
    raise exception 'Demasiados grupos creados en poco tiempo' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if cardinality(coalesce(p_roles, '{}')) > 4 or exists (
    select 1 from unnest(coalesce(p_roles, '{}')) r
    where not exists (select 1 from public.game_roles g where g.id = r and g.game_id = p_game_id)
  ) then raise exception 'Rol no válido' using errcode = '23514'; end if;
  if p_starts_at is not null and (p_starts_at < now() - interval '1 hour' or p_starts_at > now() + interval '14 days') then
    raise exception 'Fecha fuera de rango' using errcode = '23514';
  end if;

  insert into public.lobbies (game_id, owner_id, mode_slug, slots, note, rank_min_id, rank_max_id, region_id, language, goal, starts_at)
  values (p_game_id, uid, p_mode_slug, cap, nullif(btrim(p_note), ''), p_rank_min, p_rank_max, p_region, p_language, p_goal, p_starts_at)
  returning id into new_id;
  insert into public.lobby_members (lobby_id, user_id) values (new_id, uid);
  insert into public.lobby_needed_roles (lobby_id, role_id) select new_id, unnest(coalesce(p_roles, '{}'));
  return new_id;
end $$;

create function public.request_join(p_lobby uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into l from public.lobbies where id = p_lobby for update;
  if l.id is null or l.status <> 'open' then
    raise exception 'El grupo no admite solicitudes' using errcode = 'P0001', hint = 'not_open';
  end if;
  if exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = uid) then
    raise exception 'Ya eres miembro' using errcode = 'P0001', hint = 'already_member';
  end if;
  if (select count(*) from public.lobby_requests where user_id = uid and status = 'pending') >= 10 then
    raise exception 'Demasiadas solicitudes pendientes' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.lobby_requests (lobby_id, user_id, message)
  values (p_lobby, uid, nullif(btrim(p_message), ''))
  returning id into rid;
  return rid;
exception when unique_violation then
  raise exception 'Ya tienes una solicitud en este grupo' using errcode = 'P0001', hint = 'duplicate';
end $$;

create function public.respond_request(p_request uuid, p_accept boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); r record; l record; n int;
begin
  select * into r from public.lobby_requests where id = p_request;
  if r.id is null then raise exception 'No existe' using errcode = 'P0001', hint = 'not_found'; end if;
  -- Bloqueo del grupo: dos aceptaciones simultáneas no pueden pasar del cupo.
  select * into l from public.lobbies where id = r.lobby_id for update;
  if l.owner_id is distinct from uid then raise exception 'Solo el creador' using errcode = '42501'; end if;
  select * into r from public.lobby_requests where id = p_request for update;
  if r.status <> 'pending' then raise exception 'Ya respondida' using errcode = 'P0001', hint = 'not_pending'; end if;

  if not p_accept then
    update public.lobby_requests set status = 'rejected', decided_at = now() where id = p_request;
    return;
  end if;
  if l.status <> 'open' then raise exception 'Grupo completo o cerrado' using errcode = 'P0001', hint = 'not_open'; end if;
  select count(*) into n from public.lobby_members where lobby_id = l.id;
  if n >= l.slots then raise exception 'No quedan plazas' using errcode = 'P0001', hint = 'full'; end if;

  update public.lobby_requests set status = 'accepted', decided_at = now() where id = p_request;
  insert into public.lobby_members (lobby_id, user_id) values (l.id, r.user_id);
  perform public.lobby_refresh_status(l.id);
end $$;

create function public.withdraw_request(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.lobby_requests set status = 'withdrawn', decided_at = now()
  where lobby_id = p_lobby and user_id = auth.uid() and status = 'pending';
end $$;

create function public.leave_lobby(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record;
begin
  select * into l from public.lobbies where id = p_lobby for update;
  if l.id is null then return; end if;
  if l.owner_id = uid then raise exception 'El creador cierra el grupo, no lo abandona' using errcode = 'P0001', hint = 'owner'; end if;
  delete from public.lobby_members where lobby_id = p_lobby and user_id = uid;
  update public.lobby_requests set status = 'withdrawn', decided_at = now()
  where lobby_id = p_lobby and user_id = uid and status = 'accepted';
  perform public.lobby_refresh_status(p_lobby);
end $$;

create function public.close_lobby(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.lobbies set status = 'closed' where id = p_lobby and owner_id = auth.uid() and status <> 'closed';
  if not found then raise exception 'No se puede cerrar' using errcode = '42501'; end if;
  update public.lobby_requests set status = 'rejected', decided_at = now() where lobby_id = p_lobby and status = 'pending';
end $$;

revoke execute on function public.create_lobby, public.request_join, public.respond_request, public.withdraw_request,
  public.leave_lobby, public.close_lobby, public.lobby_refresh_status, public.is_lobby_member from public, anon;
grant execute on function public.create_lobby, public.request_join, public.respond_request, public.withdraw_request,
  public.leave_lobby, public.close_lobby, public.is_lobby_member to authenticated;
