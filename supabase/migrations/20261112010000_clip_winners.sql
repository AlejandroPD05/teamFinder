-- Ganadores semanales de Clip Zone (prompt §6: «publicar ganadores semanales y mantener un archivo»).
-- Reglas (visibles en /clips/ganadores):
--   · Semana de lunes 00:00 a domingo 23:59, hora de España.
--   · Por cada emblema gana el clip publicado esa semana que más emblemas de ese tipo recibe esa misma semana.
--   · Solo cuentan emblemas de cuentas con más de un día al darlo (contra cuentas creadas para votar).
--   · Mínimo 3 emblemas; empate: gana el clip publicado antes. Los clips ocultos por moderación no ganan.
-- Se calcula al vuelo: los emblemas posteriores a la semana no cuentan, así que el resultado de una semana cerrada no cambia.

create function public.clip_weekly_winners(
  p_game text,
  p_weeks int default 8,
  p_min_votes int default 3,
  p_min_voter_age interval default interval '1 day'
)
returns table (week_start date, emblem_id uuid, clip_id uuid, votes int, closed boolean)
language sql stable security definer set search_path = '' as $$
  with params as (
    select date_trunc('week', now() at time zone 'Europe/Madrid')::date as this_week,
      least(greatest(p_weeks, 0), 52) as weeks,
      greatest(p_min_votes, 1) as min_votes
  ),
  counted as (
    select date_trunc('week', c.created_at at time zone 'Europe/Madrid')::date as ws,
      c.id as clip_id, v.emblem_id, count(*)::int as n, c.created_at
    from public.clips c
    join public.clip_votes v on v.clip_id = c.id
    join auth.users u on u.id = v.user_id
    where c.game_id = p_game
      and not c.hidden
      and date_trunc('week', v.created_at at time zone 'Europe/Madrid')
        = date_trunc('week', c.created_at at time zone 'Europe/Madrid')
      and u.created_at <= v.created_at - p_min_voter_age
    group by 1, 2, 3, 5
  ),
  ranked as (
    select counted.*, row_number() over (partition by ws, counted.emblem_id order by n desc, created_at asc) as rn
    from counted, params
    where n >= params.min_votes and ws >= params.this_week - params.weeks * 7
  )
  select r.ws, r.emblem_id, r.clip_id, r.n, r.ws < p.this_week
  from ranked r, params p
  where r.rn = 1
  order by r.ws desc;
$$;
revoke execute on function public.clip_weekly_winners(text, int, int, interval) from public, anon;
grant execute on function public.clip_weekly_winners(text, int, int, interval) to authenticated;
