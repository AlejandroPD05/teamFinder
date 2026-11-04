-- Fase 5: chat de sala por grupo, en tiempo real, solo para sus miembros.

create table public.lobby_messages (
  id bigint generated always as identity primary key,
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index lobby_messages_lobby on public.lobby_messages (lobby_id, id desc);
create index lobby_messages_user_time on public.lobby_messages (user_id, created_at desc);

-- Última lectura por sala (para «sin leer» en la bandeja).
create table public.lobby_reads (
  lobby_id uuid not null references public.lobbies (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_id bigint not null default 0,
  primary key (lobby_id, user_id)
);

alter table public.lobby_messages enable row level security;
alter table public.lobby_reads enable row level security;

-- Leer: solo miembros actuales (quien sale del grupo deja de ver la sala).
create policy "messages read members" on public.lobby_messages for select to authenticated
  using (public.is_lobby_member(lobby_id));
create policy "reads own" on public.lobby_reads for select to authenticated
  using (user_id = (select auth.uid()));

revoke all on public.lobby_messages, public.lobby_reads from anon;
revoke insert, update, delete on public.lobby_messages, public.lobby_reads from authenticated;

-- Enviar: miembro, sala no cerrada y límite de ritmo (anti-spam).
create function public.send_message(p_lobby uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); st public.lobby_status; mid bigint; body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select status into st from public.lobbies where id = p_lobby;
  if st is null or not exists (select 1 from public.lobby_members where lobby_id = p_lobby and user_id = uid) then
    raise exception 'No eres miembro' using errcode = '42501', hint = 'not_member';
  end if;
  if st = 'closed' then raise exception 'Sala cerrada' using errcode = 'P0001', hint = 'closed'; end if;
  if char_length(body) < 1 or char_length(body) > 500 then
    raise exception 'Mensaje vacío o demasiado largo' using errcode = '22023', hint = 'invalid';
  end if;
  if (select count(*) from public.lobby_messages where user_id = uid and created_at > now() - interval '10 seconds') >= 5
     or (select count(*) from public.lobby_messages where user_id = uid and created_at > now() - interval '10 minutes') >= 60 then
    raise exception 'Vas demasiado rápido' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.lobby_messages (lobby_id, user_id, body) values (p_lobby, uid, body) returning id into mid;
  return mid;
end $$;

create function public.mark_read(p_lobby uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); last bigint;
begin
  if uid is null or not public.is_lobby_member(p_lobby) then return; end if;
  select coalesce(max(id), 0) into last from public.lobby_messages where lobby_id = p_lobby;
  insert into public.lobby_reads (lobby_id, user_id, last_read_id) values (p_lobby, uid, last)
  on conflict (lobby_id, user_id) do update set last_read_id = greatest(public.lobby_reads.last_read_id, excluded.last_read_id);
end $$;

-- Bandeja: mis salas activas con último mensaje y número sin leer.
create function public.my_rooms() returns table (
  lobby_id uuid, mode_slug text, status public.lobby_status, owner_id uuid,
  last_body text, last_user_id uuid, last_at timestamptz, unread bigint
)
language sql stable security definer set search_path = '' as $$
  select l.id, l.mode_slug, l.status, l.owner_id, m.body, m.user_id, m.created_at,
         (select count(*) from public.lobby_messages x
           where x.lobby_id = l.id and x.user_id <> (select auth.uid())
             and x.id > coalesce((select r.last_read_id from public.lobby_reads r
                                   where r.lobby_id = l.id and r.user_id = (select auth.uid())), 0))
  from public.lobby_members mem
  join public.lobbies l on l.id = mem.lobby_id
  left join lateral (
    select body, user_id, created_at from public.lobby_messages where lobby_id = l.id order by id desc limit 1
  ) m on true
  where mem.user_id = (select auth.uid()) and l.status <> 'closed'
  order by coalesce(m.created_at, l.created_at) desc
$$;

revoke execute on function public.send_message, public.mark_read, public.my_rooms from public, anon;
grant execute on function public.send_message, public.mark_read, public.my_rooms to authenticated;

-- Tiempo real: Realtime aplica la RLS de lectura a cada suscriptor.
alter publication supabase_realtime add table public.lobby_messages;
