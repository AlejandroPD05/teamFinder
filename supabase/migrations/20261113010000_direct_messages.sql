-- Mensajes privados entre dos personas (prompt: «mensajes privados», después de la beta).
-- Reglas: no contigo mismo, no si hay bloqueo en cualquier sentido, y solo si la otra persona los admite
-- (`profiles.dm_policy`). Límites contra el spam. Denunciables como los mensajes de las salas.

alter table public.profiles add column dm_policy text not null default 'registered'
  check (dm_policy in ('registered', 'none'));

create table public.direct_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles (id) on delete cascade,
  user_b uuid not null references public.profiles (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  last_message_at timestamptz,
  check (user_a < user_b),
  unique (user_a, user_b)
);
create index direct_conversations_a on public.direct_conversations (user_a, last_message_at desc);
create index direct_conversations_b on public.direct_conversations (user_b, last_message_at desc);

create table public.direct_messages (
  id bigint generated always as identity primary key,
  conversation_id uuid not null references public.direct_conversations (id) on delete cascade,
  sender_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  created_at timestamptz not null default now()
);
create index direct_messages_conv on public.direct_messages (conversation_id, id desc);
create index direct_messages_sender_time on public.direct_messages (sender_id, created_at desc);

create table public.direct_reads (
  conversation_id uuid not null references public.direct_conversations (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  last_read_id bigint not null default 0,
  primary key (conversation_id, user_id)
);

create function private.is_participant(p_conv uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.direct_conversations
    where id = p_conv and (select auth.uid()) in (user_a, user_b)
  );
$$;
grant execute on function private.is_participant(uuid) to authenticated;

alter table public.direct_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.direct_reads enable row level security;
create policy "dm conversations own" on public.direct_conversations for select to authenticated
  using ((select auth.uid()) in (user_a, user_b));
create policy "dm messages own" on public.direct_messages for select to authenticated
  using (private.is_participant(conversation_id));
create policy "dm reads own" on public.direct_reads for select to authenticated using (user_id = (select auth.uid()));
revoke all on public.direct_conversations, public.direct_messages, public.direct_reads from anon;
revoke insert, update, delete on public.direct_conversations, public.direct_messages, public.direct_reads
  from authenticated;

create trigger direct_messages_restricted before insert on public.direct_messages
  for each row execute function private.block_if_restricted('sender_id');

-- Abre (o recupera) la conversación con otra persona.
create function public.start_conversation(p_other uuid) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); a uuid; b uuid; cid uuid; policy text;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if p_other = uid then raise exception 'No contigo' using errcode = 'P0001', hint = 'self'; end if;
  select dm_policy into policy from public.profiles where id = p_other;
  if policy is null or private.blocked_with(p_other) then
    raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable';
  end if;
  a := least(uid, p_other); b := greatest(uid, p_other);
  select id into cid from public.direct_conversations where user_a = a and user_b = b;
  if cid is not null then return cid; end if;
  if policy = 'none' then raise exception 'No admite mensajes' using errcode = 'P0001', hint = 'closed'; end if;
  if (select count(*) from public.direct_conversations where created_by = uid and created_at > now() - interval '1 day') >= 20 then
    raise exception 'Demasiadas conversaciones nuevas hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.direct_conversations (user_a, user_b, created_by) values (a, b, uid) returning id into cid;
  return cid;
end $$;

create function public.send_direct_message(p_conversation uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c record; other uuid; mid bigint; body text := btrim(coalesce(p_body, ''));
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into c from public.direct_conversations where id = p_conversation for update;
  if c.id is null or uid not in (c.user_a, c.user_b) then
    raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable';
  end if;
  other := case when c.user_a = uid then c.user_b else c.user_a end;
  if private.blocked_with(other) then raise exception 'No disponible' using errcode = 'P0001', hint = 'unavailable'; end if;
  if (select dm_policy from public.profiles where id = other) = 'none'
     and not exists (select 1 from public.direct_messages where conversation_id = c.id and sender_id = other) then
    raise exception 'No admite mensajes' using errcode = 'P0001', hint = 'closed';
  end if;
  if char_length(body) not between 1 and 1000 then raise exception 'Mensaje no válido' using errcode = '22023', hint = 'invalid'; end if;
  if (select count(*) from public.direct_messages where sender_id = uid and created_at > now() - interval '1 minute') >= 15 then
    raise exception 'Demasiado rápido' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.direct_messages (conversation_id, sender_id, body) values (c.id, uid, body) returning id into mid;
  update public.direct_conversations set last_message_at = now() where id = c.id;
  insert into public.direct_reads (conversation_id, user_id, last_read_id) values (c.id, uid, mid)
  on conflict (conversation_id, user_id) do update set last_read_id = excluded.last_read_id;
  return mid;
end $$;

create function public.mark_direct_read(p_conversation uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); last_id bigint;
begin
  if not private.is_participant(p_conversation) then return; end if;
  select max(id) into last_id from public.direct_messages where conversation_id = p_conversation;
  insert into public.direct_reads (conversation_id, user_id, last_read_id) values (p_conversation, uid, coalesce(last_id, 0))
  on conflict (conversation_id, user_id) do update set last_read_id = excluded.last_read_id;
end $$;

-- Bandeja: conversaciones con la otra persona, el último mensaje y los no leídos.
create function public.my_conversations() returns table (
  conversation_id uuid, other_id uuid, last_body text, last_sender uuid, last_at timestamptz, unread bigint, blocked boolean
)
language sql stable security definer set search_path = '' as $$
  select c.id,
    case when c.user_a = auth.uid() then c.user_b else c.user_a end as other_id,
    m.body, m.sender_id, m.created_at,
    (select count(*) from public.direct_messages x
      where x.conversation_id = c.id and x.sender_id <> auth.uid()
        and x.id > coalesce((select r.last_read_id from public.direct_reads r where r.conversation_id = c.id and r.user_id = auth.uid()), 0)),
    private.blocked_with(case when c.user_a = auth.uid() then c.user_b else c.user_a end)
  from public.direct_conversations c
  left join lateral (
    select body, sender_id, created_at from public.direct_messages where conversation_id = c.id order by id desc limit 1
  ) m on true
  where auth.uid() in (c.user_a, c.user_b) and c.last_message_at is not null
  order by c.last_message_at desc;
$$;

-- Denunciar un mensaje privado que has recibido (con copia, como en las salas).
alter table public.reports add column direct_message_id bigint references public.direct_messages (id) on delete set null;
create function public.report_direct_message(p_message bigint, p_reason public.report_reason, p_details text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); m record; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Demasiadas denuncias hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  select dm.* into m from public.direct_messages dm where dm.id = p_message and private.is_participant(dm.conversation_id);
  if m.id is null or m.sender_id = uid then raise exception 'Mensaje no válido' using errcode = 'P0001', hint = 'invalid'; end if;
  insert into public.reports (reporter_id, target_user_id, direct_message_id, message_snapshot, reason, details)
  values (uid, m.sender_id, m.id, m.body, p_reason, nullif(btrim(p_details), ''))
  returning id into rid;
  return rid;
end $$;

revoke execute on function public.start_conversation, public.send_direct_message, public.mark_direct_read,
  public.my_conversations, public.report_direct_message from public, anon;
grant execute on function public.start_conversation, public.send_direct_message, public.mark_direct_read,
  public.my_conversations, public.report_direct_message to authenticated;

alter publication supabase_realtime add table public.direct_messages;
