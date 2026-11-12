-- Cartas de CS2 con arte original (estilo pegatina sobre papel pintado), dibujado para la web: sin nada de Valve ni de
-- terceros (ver tools/cs2-stickers.py). Se sirven desde la propia web (/cards/cs2/*.svg). Con ellas, CS2 tiene misión.

alter table public.collectible_cards drop constraint collectible_cards_image_url_check;
alter table public.collectible_cards add constraint collectible_cards_image_url_check check (
  image_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$'
  or image_url ~ '^https://drop-assets\.ea\.com/images/[A-Za-z0-9/_.\-]+\.(jpg|png)$'
  or image_url ~ '^/cards/[a-z0-9-]+/[a-z0-9-]+\.svg$'
);
alter table public.collectible_cards drop constraint collectible_cards_source_check;
alter table public.collectible_cards add constraint collectible_cards_source_check
  check (source in ('official', 'fanart', 'original'));

insert into public.collectible_cards (game_id, slug, name, image_url, rarity, source, credit)
select 'cs2', v.slug, v.name, '/cards/cs2/' || v.slug || '.svg', private.card_rarity_for('cs2:' || v.slug),
  'original', 'Arte original de TeamFinder'
from (values
  ('ace', 'Ace'),
  ('clutch', 'Clutch'),
  ('eco', 'Ronda eco'),
  ('entry', 'Entry'),
  ('francotirador', 'Francotirador'),
  ('flash', 'Flash'),
  ('humo', 'Humo'),
  ('molotov', 'Molotov'),
  ('kit-desactivacion', 'Kit de desactivación'),
  ('bomba', 'Bomba plantada'),
  ('headshot', 'Headshot'),
  ('rush-b', 'Rush B')
) as v(slug, name)
where exists (select 1 from public.games where id = 'cs2')
on conflict (game_id, slug) do nothing;

insert into public.missions (game_id, slug, title, description, kind, target, sort)
select g.id, 'llenar-grupos', 'Llena 10 grupos',
  'Crea grupos de ' || g.name || ', llénalos y ciérralos al terminar de jugar. Cuenta uno al día.', 'fill_lobbies', 10, 1
from public.games g where g.id = 'cs2'
on conflict (game_id, slug) do nothing;
