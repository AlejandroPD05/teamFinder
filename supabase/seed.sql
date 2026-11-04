-- Catálogo de VALORANT (datos de configuración, no datos de usuarios).
-- Roster revisado el 2026-11-04 con fuentes secundarias (29 agentes, último: Miks).
-- Riot añade agentes cada pocos actos: verificar en las notas de parche y añadir aquí.

insert into public.games (id, name, sort) values ('valorant', 'VALORANT', 1);

insert into public.game_roles (game_id, slug, name, sort) values
  ('valorant', 'duelist', 'Duelista', 1),
  ('valorant', 'initiator', 'Iniciador', 2),
  ('valorant', 'controller', 'Controlador', 3),
  ('valorant', 'sentinel', 'Centinela', 4);

insert into public.game_characters (game_id, role_id, slug, name)
select 'valorant', r.id, a.slug, a.name
from (values
  ('duelist', 'jett', 'Jett'), ('duelist', 'phoenix', 'Phoenix'), ('duelist', 'reyna', 'Reyna'),
  ('duelist', 'raze', 'Raze'), ('duelist', 'yoru', 'Yoru'), ('duelist', 'neon', 'Neon'),
  ('duelist', 'iso', 'Iso'), ('duelist', 'waylay', 'Waylay'),
  ('initiator', 'sova', 'Sova'), ('initiator', 'breach', 'Breach'), ('initiator', 'skye', 'Skye'),
  ('initiator', 'kayo', 'KAY/O'), ('initiator', 'fade', 'Fade'), ('initiator', 'gekko', 'Gekko'),
  ('initiator', 'tejo', 'Tejo'),
  ('controller', 'brimstone', 'Brimstone'), ('controller', 'omen', 'Omen'), ('controller', 'viper', 'Viper'),
  ('controller', 'astra', 'Astra'), ('controller', 'harbor', 'Harbor'), ('controller', 'clove', 'Clove'),
  ('controller', 'miks', 'Miks'),
  ('sentinel', 'sage', 'Sage'), ('sentinel', 'cypher', 'Cypher'), ('sentinel', 'killjoy', 'Killjoy'),
  ('sentinel', 'chamber', 'Chamber'), ('sentinel', 'deadlock', 'Deadlock'), ('sentinel', 'vyse', 'Vyse'),
  ('sentinel', 'veto', 'Veto')
) as a(role_slug, slug, name)
join public.game_roles r on r.game_id = 'valorant' and r.slug = a.role_slug;

insert into public.game_ranks (game_id, slug, name, tier)
select 'valorant', t.slug || coalesce('-' || d, ''), t.name || coalesce(' ' || d, ''),
       (t.base * 3 + coalesce(d, 1))::smallint
from (values
  (0, 'iron', 'Hierro', true), (1, 'bronze', 'Bronce', true), (2, 'silver', 'Plata', true),
  (3, 'gold', 'Oro', true), (4, 'platinum', 'Platino', true), (5, 'diamond', 'Diamante', true),
  (6, 'ascendant', 'Ascendente', true), (7, 'immortal', 'Inmortal', true), (8, 'radiant', 'Radiante', false)
) as t(base, slug, name, divisions)
left join lateral (select generate_series(1, 3) as d where t.divisions) g on true;

insert into public.game_modes (game_id, slug, name, party_size, sort) values
  ('valorant', 'duo', 'DuoQ', 2, 1),
  ('valorant', 'trio', 'TrioQ', 3, 2),
  ('valorant', 'five', 'FiveStack', 5, 3);

insert into public.game_regions (game_id, slug, name, sort) values
  ('valorant', 'eu', 'Europa', 1),
  ('valorant', 'na', 'Norteamérica', 2),
  ('valorant', 'latam', 'Latinoamérica', 3),
  ('valorant', 'br', 'Brasil', 4),
  ('valorant', 'ap', 'Asia-Pacífico', 5),
  ('valorant', 'kr', 'Corea', 6);
