-- SOLO DESARROLLO LOCAL. Nunca ejecutar en Supabase cloud.
-- Crea 1000 jugadores FICTICIOS ("Demo …", correos @demo.invalid) para probar la búsqueda y su rendimiento.
-- Uso: docker exec -i supabase_db_teamFinder psql -U postgres < supabase/dev/demo-players.sql
-- Borrado: delete from auth.users where email like '%@demo.invalid';

do $$
declare
  i int;
  uid uuid;
  ranks uuid[] := array(select id from public.game_ranks where game_id = 'valorant' order by tier);
  regions uuid[] := array(select id from public.game_regions where game_id = 'valorant' order by sort);
  roles uuid[] := array(select id from public.game_roles where game_id = 'valorant' order by sort);
  chars uuid[] := array(select id from public.game_characters where game_id = 'valorant' order by slug);
  statuses public.character_status[] := array['main','comfort','playable','flexible']::public.character_status[];
  v_langs text[] := array['es','en','pt','fr'];
  v_slots text[] := array['weekday_evening','weekday_night','weekend_afternoon','weekend_evening'];
  v_goals text[] := array['ranked','casual','improve','fun'];
  v_modes text[] := array['duo','trio','five'];
begin
  for i in 1..1000 loop
    uid := gen_random_uuid();
    insert into auth.users (id, instance_id, aud, role, email, raw_user_meta_data, email_confirmed_at, created_at, updated_at)
    values (uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'demo' || i || '@demo.invalid', jsonb_build_object('full_name', 'Demo ' || i), now(), now(), now());

    update public.profiles set
      languages = array[v_langs[1 + i % 4]],
      availability = array[v_slots[1 + i % 4], v_slots[1 + (i / 4) % 4]],
      goals = array[v_goals[1 + i % 4]],
      voice = (array['voice','listen','text'])[1 + i % 3],
      languages_visibility = 'public', availability_visibility = 'public', goals_visibility = 'public', voice_visibility = 'public',
      updated_at = now() - (i || ' minutes')::interval
    where id = uid;

    insert into public.game_profiles (user_id, game_id, rank_id, region_id, flex, visibility, mode_slugs, updated_at)
    values (uid, 'valorant', ranks[1 + i % array_length(ranks, 1)], regions[1 + i % 3], i % 5 = 0,
            (array['public','registered','private'])[1 + i % 3]::public.visibility, array[v_modes[1 + i % 3]],
            now() - (i || ' minutes')::interval);

    insert into public.player_roles (user_id, game_id, role_id, is_primary)
    values (uid, 'valorant', roles[1 + i % 4], true);

    insert into public.player_characters (user_id, game_id, character_id, status)
    select uid, 'valorant', chars[1 + (i + k * 7) % array_length(chars, 1)], statuses[1 + k]
    from generate_series(0, 2) k;
  end loop;
end $$;
