-- Ranking semanal comunitario (prompt §5.1; reglas elegidas por el usuario el 2026-11-13, «Compañerismo»):
--   puntos = 3 × reconocimientos de karma recibidos + 1 × grupos terminados.
-- Por juego, semana de lunes a domingo (hora de España). Para entrar hacen falta 3 grupos terminados en la semana.
-- Antiabuso: solo cuentan reconocimientos de compañeros distintos con cuenta de más de un día; un grupo terminado
-- como mucho al día; y los grupos solo cuentan si los demás miembros tienen cuentas de más de un día (como las
-- misiones). Quien ha estado restringido durante la semana no entra.
-- Al cerrar la semana, el Top 10 queda guardado para siempre como insignia (Top 1, Top 2–3, Top 4–10).

alter type public.notification_kind add value if not exists 'ranking';

-- Clasificación de una semana (la actual si no se indica). Devuelve a todos los que entran, ordenados.
-- Desempate: más reconocimientos y, después, quien llegó antes a su puntuación.
create function private.weekly_ranking(
  p_game text,
  p_week_start date default null,
  p_min_age interval default interval '1 day',
  p_min_finished int default 3
)
returns table (pos int, user_id uuid, points int, recognitions int, finished int, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  with w as (
    select ws,
      (ws::timestamp at time zone 'Europe/Madrid') as t0,
      ((ws + 7)::timestamp at time zone 'Europe/Madrid') as t1
    from (select coalesce(p_week_start, date_trunc('week', now() at time zone 'Europe/Madrid')::date) as ws) x
  ),
  -- Grupos terminados: llenos, cerrados esa semana con todos dentro y el resto de cuentas con antigüedad.
  done as (
    select lm.user_id, (l.closed_at at time zone 'Europe/Madrid')::date as d, max(l.closed_at) as at
    from public.lobbies l
    join w on l.closed_at >= w.t0 and l.closed_at < w.t1
    join public.lobby_members lm on lm.lobby_id = l.id
    where l.game_id = p_game and l.status = 'closed' and l.filled_at is not null
      and (select count(*) from public.lobby_members x where x.lobby_id = l.id) >= l.slots
      and not exists (
        select 1 from public.lobby_members o join auth.users u on u.id = o.user_id
        where o.lobby_id = l.id and o.user_id <> lm.user_id and u.created_at > l.filled_at - p_min_age
      )
    group by 1, 2
  ),
  g as (select user_id, count(*)::int as finished, max(at) as at from done group by 1),
  -- Reconocimientos de compañeros distintos, recibidos esa semana en grupos de este juego.
  k as (
    select v.target_id as user_id, count(distinct v.voter_id)::int as recognitions, max(v.created_at) as at
    from public.karma_votes v
    join w on v.created_at >= w.t0 and v.created_at < w.t1
    join public.lobbies l on l.id = v.lobby_id and l.game_id = p_game
    join auth.users u on u.id = v.voter_id
    where v.value > 0 and u.created_at <= v.created_at - p_min_age
    group by 1
  ),
  scored as (
    select g.user_id, coalesce(k.recognitions, 0) as recognitions, g.finished,
      3 * coalesce(k.recognitions, 0) + g.finished as points,
      greatest(g.at, k.at) as last_at
    from g left join k using (user_id), w
    where g.finished >= greatest(p_min_finished, 1)
      and not exists (
        select 1 from public.user_restrictions r
        where r.user_id = g.user_id and r.created_at < w.t1 and coalesce(r.lifted_at, r.until) > w.t0
      )
  )
  select (row_number() over (order by points desc, recognitions desc, last_at asc))::int,
    user_id, points, recognitions, finished, last_at
  from scored
  order by 1;
$$;
revoke execute on function private.weekly_ranking(text, date, interval, int) from public, anon;
grant execute on function private.weekly_ranking(text, date, interval, int) to authenticated;
select private.expose_function('private.weekly_ranking(text, date, interval, int)'::regprocedure);

-- Top 10 de cada semana cerrada: queda guardado aunque después cambien los datos (insignia permanente).
create table public.weekly_rank_awards (
  game_id text not null references public.games (id) on delete cascade,
  week_start date not null,
  user_id uuid not null references public.profiles (id) on delete cascade,
  pos smallint not null check (pos between 1 and 10),
  points int not null,
  recognitions int not null,
  finished int not null,
  created_at timestamptz not null default now(),
  primary key (game_id, week_start, user_id),
  unique (game_id, week_start, pos)
);
create index weekly_rank_awards_user on public.weekly_rank_awards (user_id, week_start desc);
alter table public.weekly_rank_awards enable row level security;
create policy "rank awards read" on public.weekly_rank_awards for select to authenticated using (true);
revoke all on public.weekly_rank_awards from anon;
revoke insert, update, delete on public.weekly_rank_awards from authenticated;

-- Cierre semanal (lunes): guarda el Top 10 de la semana anterior de cada juego y avisa a cada premiado.
-- Si ya está guardada, no hace nada (se puede ejecutar varias veces).
create function private.close_weekly_ranking(p_week_start date default null) returns int
language plpgsql security definer set search_path = '' as $$
declare
  ws date := coalesce(p_week_start, (date_trunc('week', now() at time zone 'Europe/Madrid') - interval '7 days')::date);
  g record; r record; n int := 0;
begin
  for g in select id, name from public.games where active loop
    if exists (select 1 from public.weekly_rank_awards a where a.game_id = g.id and a.week_start = ws) then
      continue;
    end if;
    for r in select * from private.weekly_ranking(g.id, ws) x where x.pos <= 10 loop
      insert into public.weekly_rank_awards (game_id, week_start, user_id, pos, points, recognitions, finished)
      values (g.id, ws, r.user_id, r.pos, r.points, r.recognitions, r.finished);
      perform private.notify(r.user_id, 'ranking', null, null, null,
        'Top ' || r.pos || ' de ' || g.name || ' en la semana del ' || to_char(ws, 'DD/MM') || ' (' || r.points || ' puntos).');
      n := n + 1;
    end loop;
  end loop;
  return n;
end $$;
revoke execute on function private.close_weekly_ranking(date) from public, anon, authenticated;

-- Lunes a las 00:10 UTC (ya es lunes en España).
select cron.schedule('close-weekly-ranking', '10 0 * * 1', 'select private.close_weekly_ranking()');

-- Insignias del perfil: se añaden los puestos del ranking semanal.
create or replace function private.player_badges(p_user uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare cards jsonb; awards jsonb := '[]'::jsonb; ranks jsonb; g record;
begin
  if auth.uid() is null or private.blocked_with(p_user) then return null; end if;
  select coalesce(jsonb_agg(jsonb_build_object(
      'game_id', x.game_id, 'owned', x.owned, 'total', x.total, 'legendary', x.legendary) order by x.sort), '[]'::jsonb)
  into cards
  from (
    select gm.id as game_id, gm.sort,
      count(uc.card_id)::int as owned,
      count(c.id)::int as total,
      coalesce(jsonb_agg(c.name order by c.name) filter (where uc.card_id is not null and c.rarity = 'legendary'), '[]'::jsonb) as legendary
    from public.games gm
    join public.collectible_cards c on c.game_id = gm.id and c.active
    left join public.user_cards uc on uc.card_id = c.id and uc.user_id = p_user
    where gm.active
    group by gm.id, gm.sort
  ) x
  where x.owned > 0;

  for g in select id from public.games where active loop
    awards := awards || coalesce((
      select jsonb_agg(jsonb_build_object('week_start', w.week_start, 'emblem', e.name, 'clip_id', cl.id, 'title', cl.title, 'game_id', g.id))
      from public.clip_weekly_winners(g.id, 52) w
      join public.clips cl on cl.id = w.clip_id
      join public.clip_emblems e on e.id = w.emblem_id
      where w.closed and cl.user_id = p_user
    ), '[]'::jsonb);
  end loop;

  select coalesce(jsonb_agg(jsonb_build_object('game_id', a.game_id, 'week_start', a.week_start, 'pos', a.pos, 'points', a.points)
    order by a.week_start desc, a.pos), '[]'::jsonb)
  into ranks
  from public.weekly_rank_awards a where a.user_id = p_user;

  return jsonb_build_object('cards', cards, 'clip_awards', awards, 'rank_awards', ranks);
end $$;
