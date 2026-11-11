-- Clip Zone (prompt §6): clips por enlace (sin subir vídeo), emblemas para valorar y comentarios, con moderación.
-- Solo se guardan proveedor + id del vídeo, nunca una URL libre: la web construye el reproductor (sin iframes ajenos).
-- Los emblemas son reconocimientos positivos (no hay votos negativos); los ganadores semanales quedan para más adelante.

create type public.clip_provider as enum ('youtube', 'twitch', 'streamable');

-- Emblemas/categorías configurables (prompt: «configurables, sin nombres de eventos codificados»).
create table public.clip_emblems (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9-]{2,32}$'),
  name text not null check (char_length(name) between 2 and 40),
  description text not null check (char_length(description) between 2 and 120),
  -- skill: jugada (ace, clutch); subjective: gusto (gracioso, favorito). El prompt pide distinguirlas.
  kind text not null check (kind in ('skill', 'subjective')),
  sort smallint not null default 0,
  active boolean not null default true
);

create table public.clips (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id),
  emblem_id uuid not null references public.clip_emblems (id), -- categoría con la que se publica
  title text not null check (char_length(btrim(title)) between 3 and 80 and title !~ '[<>]'),
  provider public.clip_provider not null,
  video_id text not null,
  hidden boolean not null default false, -- ocultado por moderación
  created_at timestamptz not null default now(),
  constraint clips_video_id check (
    (provider = 'youtube' and video_id ~ '^[A-Za-z0-9_-]{11}$')
    or (provider = 'twitch' and video_id ~ '^[A-Za-z0-9_-]{4,100}$')
    or (provider = 'streamable' and video_id ~ '^[a-z0-9]{4,12}$')
  ),
  unique (provider, video_id)
);
create index clips_feed on public.clips (game_id, created_at desc) where not hidden;

create table public.clip_votes (
  clip_id uuid not null references public.clips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  emblem_id uuid not null references public.clip_emblems (id),
  created_at timestamptz not null default now(),
  primary key (clip_id, user_id, emblem_id)
);
create index clip_votes_clip on public.clip_votes (clip_id);

create table public.clip_comments (
  id bigint generated always as identity primary key,
  clip_id uuid not null references public.clips (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 300),
  hidden boolean not null default false,
  created_at timestamptz not null default now()
);
create index clip_comments_clip on public.clip_comments (clip_id, created_at);

-- ---------- Lectura ----------
-- Clips visibles con sesión: no ocultos y sin bloqueo entre autor y quien mira.
alter table public.clip_emblems enable row level security;
alter table public.clips enable row level security;
alter table public.clip_votes enable row level security;
alter table public.clip_comments enable row level security;

create policy "emblems read" on public.clip_emblems for select to anon, authenticated using (active);
create policy "clips read" on public.clips for select to authenticated
  using ((not hidden or user_id = (select auth.uid()) or public.is_admin()) and not private.blocked_with(user_id));
create policy "clip votes read" on public.clip_votes for select to authenticated
  using (exists (select 1 from public.clips c where c.id = clip_id));
create policy "clip comments read" on public.clip_comments for select to authenticated
  using (
    (not hidden or user_id = (select auth.uid()) or public.is_admin())
    and not private.blocked_with(user_id)
    and exists (select 1 from public.clips c where c.id = clip_id)
  );

revoke all on public.clips, public.clip_votes, public.clip_comments from anon;
revoke insert, update, delete on public.clip_emblems, public.clips, public.clip_votes, public.clip_comments
  from authenticated;

-- ---------- Escritura (solo por funciones, con límites) ----------
create function public.post_clip(p_game text, p_emblem uuid, p_title text, p_provider public.clip_provider, p_video text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); new_id uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if not exists (select 1 from public.games where id = p_game and active) then
    raise exception 'Juego no válido' using errcode = '23514';
  end if;
  if not exists (select 1 from public.clip_emblems where id = p_emblem and active) then
    raise exception 'Categoría no válida' using errcode = '23514';
  end if;
  if (select count(*) from public.clips where user_id = uid and created_at > now() - interval '1 day') >= 5 then
    raise exception 'Demasiados clips hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.clips (user_id, game_id, emblem_id, title, provider, video_id)
  values (uid, p_game, p_emblem, btrim(p_title), p_provider, p_video)
  returning id into new_id;
  return new_id;
exception when unique_violation then
  raise exception 'Ese clip ya está publicado' using errcode = 'P0001', hint = 'duplicate';
end $$;

create function public.delete_my_clip(p_clip uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.clips where id = p_clip and user_id = auth.uid();
  if not found then raise exception 'No se puede borrar' using errcode = '42501'; end if;
end $$;

-- Dar o quitar un emblema. No a tus propios clips; como mucho 100 emblemas al día por persona.
create function public.toggle_clip_vote(p_clip uuid, p_emblem uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c record;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into c from public.clips where id = p_clip;
  if c.id is null or c.hidden or private.blocked_with(c.user_id) then
    raise exception 'Clip no disponible' using errcode = 'P0001', hint = 'not_found';
  end if;
  if c.user_id = uid then raise exception 'No puedes valorar tu clip' using errcode = 'P0001', hint = 'own'; end if;
  if not exists (select 1 from public.clip_emblems where id = p_emblem and active) then
    raise exception 'Emblema no válido' using errcode = '23514';
  end if;
  delete from public.clip_votes where clip_id = p_clip and user_id = uid and emblem_id = p_emblem;
  if found then return false; end if;
  if (select count(*) from public.clip_votes where user_id = uid and created_at > now() - interval '1 day') >= 100 then
    raise exception 'Demasiados emblemas hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.clip_votes (clip_id, user_id, emblem_id) values (p_clip, uid, p_emblem);
  return true;
end $$;

create function public.comment_clip(p_clip uuid, p_body text) returns bigint
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c record; new_id bigint;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into c from public.clips where id = p_clip;
  if c.id is null or c.hidden or private.blocked_with(c.user_id) then
    raise exception 'Clip no disponible' using errcode = 'P0001', hint = 'not_found';
  end if;
  if (select count(*) from public.clip_comments where user_id = uid and created_at > now() - interval '1 hour') >= 20 then
    raise exception 'Demasiados comentarios' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.clip_comments (clip_id, user_id, body) values (p_clip, uid, btrim(p_body)) returning id into new_id;
  return new_id;
end $$;

create function public.delete_my_clip_comment(p_comment bigint) returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.clip_comments where id = p_comment and user_id = auth.uid();
  if not found then raise exception 'No se puede borrar' using errcode = '42501'; end if;
end $$;

-- ---------- Denuncias y moderación ----------
alter table public.reports add column clip_id uuid references public.clips (id) on delete set null;
alter table public.reports add column clip_comment_id bigint references public.clip_comments (id) on delete set null;

-- Denunciar un clip o un comentario que puedes ver. Se guarda una copia (título o texto) por si se borra.
create function public.report_clip(p_clip uuid, p_comment bigint, p_reason public.report_reason, p_details text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); target uuid; snap text; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if (select count(*) from public.reports where reporter_id = uid and created_at > now() - interval '1 day') >= 10 then
    raise exception 'Demasiadas denuncias hoy' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  if p_comment is not null then
    select cc.user_id, cc.body into target, snap from public.clip_comments cc
    where cc.id = p_comment and cc.clip_id = p_clip and not cc.hidden;
  else
    select c.user_id, c.title || ' (' || c.provider || ':' || c.video_id || ')' into target, snap
    from public.clips c where c.id = p_clip and not c.hidden;
  end if;
  if target is null or private.blocked_with(target) then
    raise exception 'No disponible' using errcode = 'P0001', hint = 'invalid';
  end if;
  if target = uid then raise exception 'No puedes denunciarte' using errcode = 'P0001', hint = 'self'; end if;
  insert into public.reports (reporter_id, target_user_id, clip_id, clip_comment_id, message_snapshot, reason, details)
  values (uid, target, p_clip, p_comment, snap, p_reason, nullif(btrim(p_details), ''))
  returning id into rid;
  return rid;
end $$;

-- Moderación: ocultar o mostrar un clip o un comentario, con registro.
create function public.moderate_clip(p_clip uuid, p_comment bigint, p_hidden boolean, p_note text) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  if p_comment is not null then
    update public.clip_comments set hidden = p_hidden where id = p_comment;
  else
    update public.clips set hidden = p_hidden where id = p_clip;
  end if;
  insert into public.moderation_log (admin_id, action, note)
  values (auth.uid(), case when p_hidden then 'hide' else 'unhide' end
    || case when p_comment is not null then '_comment:' || p_comment else '_clip:' || p_clip end,
    nullif(btrim(p_note), ''));
end $$;

revoke execute on function public.post_clip, public.delete_my_clip, public.toggle_clip_vote, public.comment_clip,
  public.delete_my_clip_comment, public.report_clip, public.moderate_clip from public, anon;
grant execute on function public.post_clip, public.delete_my_clip, public.toggle_clip_vote, public.comment_clip,
  public.delete_my_clip_comment, public.report_clip, public.moderate_clip to authenticated;

-- ---------- Datos ----------
insert into public.clip_emblems (slug, name, description, kind, sort) values
  ('ace', 'Ace', 'Elimina a todo el equipo rival.', 'skill', 1),
  ('clutch', 'Clutch', 'Gana la ronda en desventaja.', 'skill', 2),
  ('highlight', 'Jugadón', 'Una jugada o momento que hay que ver.', 'skill', 3),
  ('comedy', 'Comedia', 'Para reírse un rato.', 'subjective', 4),
  ('favorite', 'Favorito', 'Simplemente te ha encantado.', 'subjective', 5);
