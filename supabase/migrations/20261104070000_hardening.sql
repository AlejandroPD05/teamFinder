-- Endurecimiento tras el pentest (2026-11-04). Cada bloque corresponde a un hallazgo de tests/db/security.test.ts.

-- 1) Asignación masiva en perfiles de juego: con la API se podía insertar/actualizar `rank_source = 'verified'`
--    y un `updated_at` futuro (para salir primero en la búsqueda), y saltarse los límites de roles y agentes.
--    Ahora solo se escribe mediante save_game_profile (security definer, siempre sobre auth.uid()).
drop policy "game_profiles insert own" on public.game_profiles;
drop policy "game_profiles update own" on public.game_profiles;
drop policy "game_profiles delete own" on public.game_profiles;
drop policy "player_roles own" on public.player_roles;
drop policy "player_characters own" on public.player_characters;
create policy "player_roles read own" on public.player_roles for select to authenticated using ((select auth.uid()) = user_id);
create policy "player_characters read own" on public.player_characters for select to authenticated using ((select auth.uid()) = user_id);
revoke insert, update, delete on public.game_profiles, public.player_roles, public.player_characters from anon, authenticated;
alter function public.save_game_profile(text, uuid, uuid, boolean, public.visibility, jsonb, jsonb, text[]) security definer;

-- 2) Oráculo de bloqueo: blocked_with() era llamable por RPC y revelaba si alguien te había bloqueado.
--    Se mueve a un esquema no expuesto por la API; políticas y vistas la siguen usando (referencia por OID).
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to anon, authenticated;
alter function public.blocked_with(uuid) set schema private;
revoke execute on function private.blocked_with(uuid) from public, anon;
grant execute on function private.blocked_with(uuid) to authenticated;

create or replace function public.request_join(p_lobby uuid, p_message text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); l record; rid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  select * into l from public.lobbies where id = p_lobby for update;
  if l.id is null or l.status <> 'open' or private.blocked_with(l.owner_id) then
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

-- 3) Funciones internas expuestas por RPC.
revoke execute on function public.lobby_refresh_status(uuid) from authenticated;
revoke execute on function public.handle_new_user(), public.set_updated_at(), public.check_same_game(),
  public.check_mode_slugs() from anon, authenticated;

-- 4) Miembros y roles de grupos cerrados o de alguien con bloqueo se podían listar.
--    Ahora solo son visibles si el propio grupo lo es (la subconsulta aplica la RLS de lobbies).
drop policy "members read" on public.lobby_members;
create policy "members read" on public.lobby_members for select to authenticated
  using (exists (select 1 from public.lobbies l where l.id = lobby_id));
drop policy "needed roles read" on public.lobby_needed_roles;
create policy "needed roles read" on public.lobby_needed_roles for select to authenticated
  using (exists (select 1 from public.lobbies l where l.id = lobby_id));

-- 5) Avatar: cualquier URL https. Solo puede venir del CDN de Discord y ya no se edita desde la API.
update public.profiles set avatar_url = null
where avatar_url is not null and avatar_url !~ '^https://cdn\.discordapp\.com/';
alter table public.profiles drop constraint if exists profiles_avatar_url_check;
alter table public.profiles add constraint profiles_avatar_url_check
  check (avatar_url is null or avatar_url ~ '^https://cdn\.discordapp\.com/[A-Za-z0-9/_.\-]+(\?[A-Za-z0-9=&_.\-]*)?$');
revoke update (avatar_url) on public.profiles from authenticated;

-- 6) Nombre visible: sin caracteres de control, invisibles ni de inversión de texto (suplantación), ni < >.
update public.profiles set display_name = 'Jugador'
where display_name ~ '[[:cntrl:]<>­​-‏‪-‮⁠-⁤﻿]';
alter table public.profiles add constraint profiles_display_name_chars
  check (display_name !~ '[[:cntrl:]<>­​-‏‪-‮⁠-⁤﻿]' and btrim(display_name) = display_name);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  meta jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  name text := coalesce(meta -> 'custom_claims' ->> 'global_name', meta ->> 'full_name', meta ->> 'name', 'Jugador');
  avatar text := meta ->> 'avatar_url';
begin
  name := btrim(regexp_replace(name, '[[:cntrl:]<>­​-‏‪-‮⁠-⁤﻿]', '', 'g'));
  name := btrim(left(name, 32));
  if char_length(name) < 2 then name := 'Jugador'; end if;
  if avatar is null or avatar !~ '^https://cdn\.discordapp\.com/[A-Za-z0-9/_.\-]+(\?[A-Za-z0-9=&_.\-]*)?$' then
    avatar := null;
  end if;
  insert into public.profiles (id, display_name, avatar_url) values (new.id, name, avatar);
  return new;
end $$;
revoke execute on function public.handle_new_user() from anon, authenticated;

-- 7) Enumeración anónima: cualquiera podía listar nombres y avatares de todos los usuarios.
--    Sin sesión solo aparecen perfiles con algún dato público.
create or replace view public.profile_cards with (security_invoker = false) as
select
  p.id, p.display_name, p.avatar_url,
  case when public.can_see(p.id, p.languages_visibility) then p.languages end as languages,
  case when public.can_see(p.id, p.availability_visibility) then p.availability end as availability,
  case when public.can_see(p.id, p.goals_visibility) then p.goals end as goals,
  case when public.can_see(p.id, p.voice_visibility) then p.voice end as voice,
  p.created_at
from public.profiles p
where (select auth.uid()) is not null
   or 'public' in (p.languages_visibility, p.availability_visibility, p.goals_visibility, p.voice_visibility)
   or exists (select 1 from public.game_profiles gp where gp.user_id = p.id and gp.visibility = 'public');

-- 8) Catálogo: además de la RLS, sin privilegios de escritura para la API.
revoke insert, update, delete on public.games, public.game_roles, public.game_characters, public.game_ranks,
  public.game_modes, public.game_regions from anon, authenticated;
