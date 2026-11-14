-- Ideas públicas con votos y estados (docs/PROMPT.md §7.2): moderación publica ideas (a menudo a partir de una
-- sugerencia del buzón, reescrita y sin su autor), la comunidad las vota y ve en qué punto está cada una.

alter type public.notification_kind add value if not exists 'idea_status';

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(btrim(title)) between 5 and 80 and title !~ '[<>]'),
  body text check (body is null or (char_length(body) <= 500 and body !~ '[<>]')),
  status text not null default 'pending' check (status in ('pending', 'in_progress', 'done', 'declined')),
  -- Sugerencia de la que sale (para avisar a quien la envió). Nunca se muestra.
  feedback_id uuid references public.feedback (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index ideas_status on public.ideas (status);
create index ideas_feedback on public.ideas (feedback_id);
alter table public.ideas enable row level security;
revoke all on public.ideas from anon, authenticated;
-- Se leen con public_ideas() (con el recuento de votos); directamente, nada.
create policy "ideas no access from the api" on public.ideas for select to anon, authenticated using (false);

create table public.idea_votes (
  idea_id uuid not null references public.ideas (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (idea_id, user_id)
);
create index idea_votes_user on public.idea_votes (user_id);
alter table public.idea_votes enable row level security;
revoke all on public.idea_votes from anon, authenticated;
grant select on public.idea_votes to authenticated;
create policy "own idea votes" on public.idea_votes for select to authenticated using (user_id = (select auth.uid()));

-- Lista pública: sin autores ni votantes, solo el recuento y si has votado tú.
create function private.public_ideas()
returns table (id uuid, title text, body text, status text, votes int, voted boolean, created_at timestamptz, updated_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select i.id, i.title, i.body, i.status,
    (select count(*) from public.idea_votes v where v.idea_id = i.id)::int,
    exists (select 1 from public.idea_votes v where v.idea_id = i.id and v.user_id = (select auth.uid())),
    i.created_at, i.updated_at
  from public.ideas i
  order by i.created_at desc;
$$;

create function private.vote_idea(p_idea uuid, p_on boolean) returns void
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); st text;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select status into st from public.ideas where id = p_idea;
  if st is null then raise exception 'No existe' using errcode = 'P0001', hint = 'invalid'; end if;
  if st not in ('pending', 'in_progress') then raise exception 'Ya no se vota' using errcode = 'P0001', hint = 'closed'; end if;
  if private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida' using errcode = 'P0001', hint = 'restricted';
  end if;
  if p_on then
    insert into public.idea_votes (idea_id, user_id) values (p_idea, uid) on conflict do nothing;
  else
    delete from public.idea_votes where idea_id = p_idea and user_id = uid;
  end if;
end $$;

-- Moderación: crear o editar. Al publicarla desde una sugerencia, esta queda atendida y se avisa a quien la envió; al
-- cambiar de estado (en desarrollo, completada o descartada) se avisa a quien la apoya y a quien la envió.
create function private.save_idea(p_id uuid, p_title text, p_body text, p_status text, p_feedback uuid default null)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare iid uuid := p_id; old_status text; fb uuid; author uuid; who record;
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  if p_status not in ('pending', 'in_progress', 'done', 'declined') then
    raise exception 'Estado no válido' using errcode = '22023', hint = 'invalid';
  end if;
  if iid is null then
    insert into public.ideas (title, body, status, feedback_id)
    values (btrim(p_title), nullif(btrim(coalesce(p_body, '')), ''), p_status, p_feedback)
    returning id, feedback_id into iid, fb;
    if fb is not null then
      update public.feedback set status = 'done' where id = fb returning user_id into author;
      if author is not null then perform private.notify(author, 'idea_status', null, null, null, btrim(p_title)); end if;
    end if;
  else
    select status, feedback_id into old_status, fb from public.ideas where id = iid for update;
    if old_status is null then raise exception 'No existe' using errcode = 'P0001', hint = 'invalid'; end if;
    update public.ideas
    set title = btrim(p_title), body = nullif(btrim(coalesce(p_body, '')), ''), status = p_status, updated_at = now()
    where id = iid;
    if p_status is distinct from old_status and p_status <> 'pending' then
      for who in
        select v.user_id from public.idea_votes v where v.idea_id = iid
        union
        select f.user_id from public.feedback f where f.id = fb and f.user_id is not null
      loop
        perform private.notify(who.user_id, 'idea_status', null, null, null, btrim(p_title));
      end loop;
    end if;
  end if;
  return iid;
exception when check_violation then
  raise exception 'Datos no válidos' using errcode = '23514', hint = 'invalid';
end $$;

create function private.delete_idea(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  delete from public.ideas where id = p_id;
end $$;

-- Avisos push: título y enlace del aviso nuevo.
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
      when 'idea_status' then 'Novedades sobre una idea que apoyas'
      else 'Tienes un aviso nuevo' end,
    new.body,
    case
      when new.kind = 'search_match' and new.actor_id is not null then '/jugador/' || new.actor_id
      when new.kind = 'idea_status' then '/ideas'
      when new.lobby_id is not null then '/grupos/' || new.lobby_id
      when new.clip_id is not null then '/clips/' || new.clip_id
      when new.team_id is not null then '/equipo/' || new.team_id
      else '/notificaciones' end);
  return new;
end $$;

do $$
declare f text;
begin
  revoke execute on function private.public_ideas() from public;
  grant execute on function private.public_ideas() to anon, authenticated;
  perform private.expose_function('private.public_ideas()'::regprocedure);
  foreach f in array array['private.vote_idea(uuid, boolean)', 'private.save_idea(uuid, text, text, text, uuid)',
    'private.delete_idea(uuid)'] loop
    execute format('revoke execute on function %s from public, anon', f);
    execute format('grant execute on function %s to authenticated', f);
    perform private.expose_function(f::regprocedure);
  end loop;
end $$;
