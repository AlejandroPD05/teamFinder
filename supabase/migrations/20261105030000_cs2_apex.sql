-- Counter-Strike 2 y Apex Legends: catálogos como datos de configuración (revisados el 2026-11-05).
-- Sin iconos: ni Valve ni EA ofrecen recursos de uso permitido para webs de fans (ver PROGRESS.md).
-- CS2: roles de comunidad (no del juego); rangos = bandas de color de CS Rating en Premier (umbrales de guías de
-- comunidad, sin fuente oficial de Valve). Apex: clases y rangos según la ayuda oficial de EA (es-ES).
-- Traducciones de clases de Apex sin verificar con el texto del juego. Revisar cada temporada.

insert into public.games (id, name, sort, short_name, character_label, theme_accent, theme_accent_soft, theme_glow_a, theme_glow_b) values
  ('cs2', 'Counter-Strike 2', 2, 'CS2', null, '#f5a524', '#ffc766', '#f5a524', '#2a3a52'),
  ('apex', 'Apex Legends', 3, 'APEX', 'Leyendas', '#e8453c', '#ff7a6e', '#e8453c', '#1b2a4a');

-- ---------- Counter-Strike 2 ----------
insert into public.game_roles (game_id, slug, name, sort) values
  ('cs2', 'entry', 'Entry fragger', 1),
  ('cs2', 'awper', 'AWPer', 2),
  ('cs2', 'igl', 'IGL', 3),
  ('cs2', 'support', 'Soporte', 4),
  ('cs2', 'lurker', 'Lurker', 5),
  ('cs2', 'rifler', 'Rifler', 6),
  ('cs2', 'anchor', 'Ancla', 7);

insert into public.game_ranks (game_id, slug, name, tier, color) values
  ('cs2', 'premier-0', 'Premier < 5.000', 1, '#b0c3d9'),
  ('cs2', 'premier-5000', 'Premier 5.000–9.999', 2, '#8cc6ff'),
  ('cs2', 'premier-10000', 'Premier 10.000–14.999', 3, '#6a7dff'),
  ('cs2', 'premier-15000', 'Premier 15.000–19.999', 4, '#c166ff'),
  ('cs2', 'premier-20000', 'Premier 20.000–24.999', 5, '#f03cff'),
  ('cs2', 'premier-25000', 'Premier 25.000–29.999', 6, '#eb4b4b'),
  ('cs2', 'premier-30000', 'Premier 30.000+', 7, '#ffd700');

insert into public.game_modes (game_id, slug, name, party_size, sort) values
  ('cs2', 'wingman', 'Wingman (2v2)', 2, 1),
  ('cs2', 'premier', 'Premier', 5, 2),
  ('cs2', 'competitive', 'Competitivo', 5, 3);

insert into public.game_regions (game_id, slug, name, sort) values
  ('cs2', 'eu', 'Europa', 1),
  ('cs2', 'na', 'Norteamérica', 2),
  ('cs2', 'sa', 'Sudamérica', 3),
  ('cs2', 'asia', 'Asia', 4),
  ('cs2', 'oce', 'Oceanía', 5),
  ('cs2', 'af', 'África', 6),
  ('cs2', 'cn', 'China', 7);

-- ---------- Apex Legends ----------
insert into public.game_roles (game_id, slug, name, sort) values
  ('apex', 'assault', 'Asalto', 1),
  ('apex', 'skirmisher', 'Hostigador', 2),
  ('apex', 'recon', 'Reconocimiento', 3),
  ('apex', 'support', 'Apoyo', 4),
  ('apex', 'controller', 'Controlador', 5);

-- 28 leyendas (última: Axle, temporada 29). EA anuncia cambios de clases para la temporada 32.
insert into public.game_characters (game_id, role_id, slug, name)
select 'apex', r.id, l.slug, l.name
from (values
  ('assault', 'bangalore', 'Bangalore'), ('assault', 'revenant', 'Revenant'), ('assault', 'fuse', 'Fuse'),
  ('assault', 'mad-maggie', 'Mad Maggie'), ('assault', 'ballistic', 'Ballistic'),
  ('skirmisher', 'pathfinder', 'Pathfinder'), ('skirmisher', 'wraith', 'Wraith'), ('skirmisher', 'octane', 'Octane'),
  ('skirmisher', 'horizon', 'Horizon'), ('skirmisher', 'ash', 'Ash'), ('skirmisher', 'alter', 'Alter'),
  ('skirmisher', 'axle', 'Axle'),
  ('recon', 'bloodhound', 'Bloodhound'), ('recon', 'crypto', 'Crypto'), ('recon', 'valkyrie', 'Valkyrie'),
  ('recon', 'seer', 'Seer'), ('recon', 'vantage', 'Vantage'), ('recon', 'sparrow', 'Sparrow'),
  ('support', 'gibraltar', 'Gibraltar'), ('support', 'lifeline', 'Lifeline'), ('support', 'mirage', 'Mirage'),
  ('support', 'loba', 'Loba'), ('support', 'newcastle', 'Newcastle'), ('support', 'conduit', 'Conduit'),
  ('controller', 'caustic', 'Caustic'), ('controller', 'wattson', 'Wattson'), ('controller', 'rampart', 'Rampart'),
  ('controller', 'catalyst', 'Catalyst')
) as l(role_slug, slug, name)
join public.game_roles r on r.game_id = 'apex' and r.slug = l.role_slug;

-- Divisiones IV (baja) a I (alta) hasta Diamante; Maestro y Depredador supremo sin divisiones.
insert into public.game_ranks (game_id, slug, name, tier, color)
select 'apex', t.slug || coalesce('-' || (5 - d), ''),
       t.name || coalesce(' ' || (array['I', 'II', 'III', 'IV'])[5 - d], ''),
       case when t.divisions then t.base * 4 + d else 24 + t.base - 5 end::smallint,
       t.color
from (values
  (0, 'rookie', 'Principiante', true, '#9ca0b4'), (1, 'bronze', 'Bronce', true, '#b0773f'),
  (2, 'silver', 'Plata', true, '#c0c6d0'), (3, 'gold', 'Oro', true, '#e5b83b'),
  (4, 'platinum', 'Platino', true, '#3fc1c9'), (5, 'diamond', 'Diamante', true, '#4a8cf0'),
  (6, 'master', 'Maestro', false, '#a66cf0'), (7, 'predator', 'Depredador supremo', false, '#e8453c')
) as t(base, slug, name, divisions, color)
left join lateral (select generate_series(1, 4) as d where t.divisions) g on true;

insert into public.game_modes (game_id, slug, name, party_size, sort) values
  ('apex', 'br-duos', 'Battle Royale Dúos', 2, 1),
  ('apex', 'br-trios', 'Battle Royale Tríos', 3, 2),
  ('apex', 'ranked', 'Clasificatoria', 3, 3);

insert into public.game_regions (game_id, slug, name, sort) values
  ('apex', 'eu', 'Europa', 1),
  ('apex', 'na', 'Norteamérica', 2),
  ('apex', 'sa', 'Sudamérica', 3),
  ('apex', 'me', 'Oriente Medio', 4),
  ('apex', 'asia', 'Asia', 5),
  ('apex', 'oce', 'Oceanía', 6);
