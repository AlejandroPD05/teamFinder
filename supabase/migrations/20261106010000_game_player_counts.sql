-- Contador de jugadores por juego para el selector de la portada: solo el total de perfiles de cada juego
-- (dato agregado, sin datos personales). Lo pueden leer visitantes sin sesión.
create function public.game_player_counts()
returns table (game_id text, players int)
language sql stable security definer set search_path = '' as $$
  select g.id, (select count(*) from public.game_profiles gp where gp.game_id = g.id)::int
  from public.games g
  where g.active
  order by g.sort;
$$;
revoke execute on function public.game_player_counts() from public;
grant execute on function public.game_player_counts() to anon, authenticated;
