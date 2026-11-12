-- 1) Anuncio semanal de los ganadores de clips en Discord, desde la propia base (pg_cron + pg_net), sin servicios de pago.
--    El webhook es un secreto: lo guarda el propietario a mano en `private.app_settings` (ver PROGRESS.md).
-- 2) Fanart para las cartas, solo con permiso: el artista envía su obra, acepta una licencia y moderación la revisa.

-- ---------- Ajustes privados ----------
create table private.app_settings (
  key text primary key,
  value text not null
);
revoke all on private.app_settings from public, anon, authenticated;

-- ---------- Anuncio en Discord ----------
create extension if not exists pg_net;

-- Texto del anuncio de la última semana cerrada (null si no hay ganadores).
create function private.weekly_winners_message(p_site text default null) returns text
language plpgsql stable security definer set search_path = '' as $$
declare
  site text := coalesce(p_site, (select value from private.app_settings where key = 'site_url'), 'https://teamfinder-seven.vercel.app');
  last_week date := (date_trunc('week', now() at time zone 'Europe/Madrid') - interval '7 days')::date;
  g record; w record; lines text := ''; body text;
begin
  for g in select id, name from public.games where active order by sort loop
    body := '';
    for w in
      select e.name as emblem, c.title, c.id, coalesce(p.display_name, 'Jugador') as author, x.votes
      from public.clip_weekly_winners(g.id, 2) x
      join public.clips c on c.id = x.clip_id
      join public.clip_emblems e on e.id = x.emblem_id
      left join public.profiles p on p.id = c.user_id
      where x.week_start = last_week and x.closed
      order by e.sort
    loop
      body := body || E'\n- ' || w.emblem || ': «' || w.title || '» de ' || w.author || ' (' || w.votes || ' emblemas) ' || site || '/clips/' || w.id;
    end loop;
    if body <> '' then lines := lines || E'\n\n**' || g.name || '**' || body; end if;
  end loop;
  if lines = '' then return null; end if;
  return '**Ganadores de clips de la semana del ' || to_char(last_week, 'DD/MM') || ' al ' || to_char(last_week + 6, 'DD/MM') || '**' || lines;
end $$;

create function private.announce_weekly_winners() returns text
language plpgsql security definer set search_path = '' as $$
declare
  hook text := (select value from private.app_settings where key = 'discord_winners_webhook');
  last_week text := (date_trunc('week', now() at time zone 'Europe/Madrid') - interval '7 days')::date::text;
  msg text;
begin
  if hook is null or hook !~ '^https://(discord\.com|discordapp\.com)/api/webhooks/[0-9]+/[A-Za-z0-9_-]+$' then
    return 'sin webhook';
  end if;
  if (select value from private.app_settings where key = 'discord_winners_last_week') = last_week then
    return 'ya anunciado';
  end if;
  msg := private.weekly_winners_message();
  if msg is null then return 'sin ganadores'; end if;
  perform net.http_post(
    url := hook,
    body := jsonb_build_object('content', left(msg, 1900), 'allowed_mentions', jsonb_build_object('parse', '[]'::jsonb)),
    headers := '{"Content-Type": "application/json"}'::jsonb
  );
  insert into private.app_settings (key, value) values ('discord_winners_last_week', last_week)
  on conflict (key) do update set value = excluded.value;
  return 'enviado';
end $$;
revoke execute on function private.weekly_winners_message, private.announce_weekly_winners from public, anon, authenticated;

-- Los lunes a las 09:00 UTC (10:00 u 11:00 en España).
select cron.schedule('announce-clip-winners', '0 9 * * 1', 'select private.announce_weekly_winners()');

-- ---------- Fanart ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('fanart', 'fanart', true, 2097152, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do nothing;

-- Cada persona sube solo a su carpeta (<su id>/...). Lectura pública (las cartas aprobadas se muestran a todos).
create policy "fanart upload own folder" on storage.objects for insert to authenticated
  with check (bucket_id = 'fanart' and (storage.foldername(name))[1] = (select auth.uid())::text);
create policy "fanart delete own" on storage.objects for delete to authenticated
  using (bucket_id = 'fanart' and (storage.foldername(name))[1] = (select auth.uid())::text);

create type public.fanart_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

create table public.fanart_submissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  game_id text not null references public.games (id),
  title text not null check (char_length(btrim(title)) between 2 and 60 and title !~ '[<>]'),
  artist_name text not null check (char_length(btrim(artist_name)) between 2 and 60 and artist_name !~ '[<>]'),
  portfolio_url text check (portfolio_url is null or portfolio_url ~ '^https://[^\s<>"]{4,200}$'),
  image_path text not null check (image_path ~ '^[0-9a-f-]{36}/[A-Za-z0-9_-]{1,80}\.(png|jpg|jpeg|webp)$'),
  -- Texto exacto de la licencia aceptada (ver /fanart): autoría y permiso no exclusivo, gratuito y revocable.
  license_version text not null,
  license_accepted_at timestamptz not null default now(),
  status public.fanart_status not null default 'pending',
  card_id uuid references public.collectible_cards (id) on delete set null,
  reviewed_by uuid references public.profiles (id) on delete set null,
  reviewed_at timestamptz,
  review_note text check (review_note is null or char_length(review_note) <= 300),
  created_at timestamptz not null default now()
);
create index fanart_pending on public.fanart_submissions (status, created_at);
alter table public.fanart_submissions enable row level security;
create policy "fanart own or admin" on public.fanart_submissions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());
revoke all on public.fanart_submissions from anon;
revoke insert, update, delete on public.fanart_submissions from authenticated;

alter table public.collectible_cards drop constraint collectible_cards_image_url_check;
alter table public.collectible_cards add constraint collectible_cards_image_url_check check (
  image_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$'
  or image_url ~ '^https://drop-assets\.ea\.com/images/[A-Za-z0-9/_.\-]+\.(jpg|png)$'
  or image_url ~ '^/cards/[a-z0-9-]+/[a-z0-9-]+\.svg$'
  or image_url ~ '^https?://[a-z0-9.:-]+/storage/v1/object/public/fanart/[0-9a-f-]{36}/[A-Za-z0-9_-]{1,80}\.(png|jpg|jpeg|webp)$'
);

create function public.submit_fanart(p_game text, p_title text, p_artist text, p_portfolio text, p_path text, p_license text)
returns uuid
language plpgsql security definer set search_path = '' as $$
declare uid uuid := auth.uid(); sid uuid;
begin
  if uid is null then raise exception 'Sin sesión' using errcode = '42501'; end if;
  if private.restricted_until(uid) is not null then
    raise exception 'Cuenta restringida temporalmente' using errcode = 'P0001', hint = 'restricted';
  end if;
  if split_part(p_path, '/', 1) <> uid::text
     or not exists (select 1 from storage.objects where bucket_id = 'fanart' and name = p_path) then
    raise exception 'Imagen no válida' using errcode = 'P0001', hint = 'invalid';
  end if;
  if (select count(*) from public.fanart_submissions where user_id = uid and created_at > now() - interval '7 days') >= 5 then
    raise exception 'Demasiados envíos esta semana' using errcode = 'P0001', hint = 'rate_limited';
  end if;
  insert into public.fanart_submissions (user_id, game_id, title, artist_name, portfolio_url, image_path, license_version)
  values (uid, p_game, btrim(p_title), btrim(p_artist), nullif(btrim(p_portfolio), ''), p_path, p_license)
  returning id into sid;
  return sid;
end $$;

-- Moderación: aprobar crea la carta (fanart, con crédito al artista); rechazar deja una nota.
create function public.review_fanart(p_id uuid, p_approve boolean, p_image_url text, p_rarity public.card_rarity, p_note text)
returns void
language plpgsql security definer set search_path = '' as $$
declare s record; cid uuid;
begin
  if not public.is_admin() then raise exception 'Solo moderación' using errcode = '42501'; end if;
  select * into s from public.fanart_submissions where id = p_id for update;
  if s.id is null or s.status <> 'pending' then raise exception 'No pendiente' using errcode = 'P0001', hint = 'not_pending'; end if;
  if p_approve then
    if p_image_url is null or right(p_image_url, char_length(s.image_path) + 1) <> '/' || s.image_path then
      raise exception 'Imagen no válida' using errcode = 'P0001', hint = 'invalid';
    end if;
    insert into public.collectible_cards (game_id, slug, name, image_url, rarity, source, credit)
    values (s.game_id, 'fanart-' || left(replace(s.id::text, '-', ''), 12), s.title, p_image_url, p_rarity, 'fanart',
      'Fanart de ' || s.artist_name)
    returning id into cid;
  end if;
  update public.fanart_submissions
  set status = case when p_approve then 'approved'::public.fanart_status else 'rejected' end,
      card_id = cid, reviewed_by = auth.uid(), reviewed_at = now(), review_note = nullif(btrim(p_note), '')
  where id = p_id;
  perform private.notify(s.user_id, 'fanart', null, null, null,
    case when p_approve then 'Tu fanart «' || s.title || '» ya es una carta.' else 'Tu fanart «' || s.title || '» no se ha aprobado.' || coalesce(' ' || nullif(btrim(p_note), ''), '') end);
  insert into public.moderation_log (admin_id, action, note)
  values (auth.uid(), case when p_approve then 'approve_fanart:' else 'reject_fanart:' end || p_id, nullif(btrim(p_note), ''));
end $$;

-- El artista puede retirar su permiso: la carta deja de mostrarse.
create function public.withdraw_fanart(p_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare s record;
begin
  select * into s from public.fanart_submissions where id = p_id and user_id = auth.uid() for update;
  if s.id is null or s.status = 'withdrawn' then raise exception 'No se puede retirar' using errcode = '42501'; end if;
  update public.fanart_submissions set status = 'withdrawn' where id = p_id;
  if s.card_id is not null then update public.collectible_cards set active = false where id = s.card_id; end if;
end $$;

revoke execute on function public.submit_fanart, public.review_fanart, public.withdraw_fanart from public, anon;
grant execute on function public.submit_fanart, public.review_fanart, public.withdraw_fanart to authenticated;
