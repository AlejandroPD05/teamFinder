-- Iconos de las leyendas de Apex Legends: imágenes de la web oficial de EA (characters-hub), revisadas el 2026-11-05.
-- Política de contenido de EA: uso permitido en webs de fans sin ánimo de lucro, con su aviso y sin recursos extraídos
-- de los archivos del juego. Se enlazan desde su CDN (drop-assets.ea.com) a través del optimizador de Next.

alter table public.game_characters drop constraint if exists game_characters_icon_url_check;
alter table public.game_characters add constraint game_characters_icon_url_check check (
  icon_url is null
  or icon_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$'
  or icon_url ~ '^https://drop-assets\.ea\.com/images/[A-Za-z0-9/_.\-]+\.(jpg|png)$'
);

update public.game_characters c set icon_url = v.url
from (values
  ('alter', 'https://drop-assets.ea.com/images/2IfZi30O5KjeTbAHqMGPys/dbd942301f0b723e4f3e30ce27569824/apex-grid-tile-legends-Alter.jpg'),
  ('ash', 'https://drop-assets.ea.com/images/4WVk1SMnlzgjk2E3T7f7HC/2db236ad12e23d7a953fa5278b641d5d/apex-grid-tile-legends-Ash.jpg'),
  ('axle', 'https://drop-assets.ea.com/images/6qfSn0cTb5QKHs9YnQEvXI/e4dcb18fd400ea18b7e0cb3ccfba02e0/apex-grid-tile-legends-Axle.jpg'),
  ('ballistic', 'https://drop-assets.ea.com/images/2GzrmZx2WNaOzbrdvxf1XB/f7d4fe018c53977c08347bb4f8d92e0d/apex-grid-tile-legends-Ballistic.jpg'),
  ('bangalore', 'https://drop-assets.ea.com/images/59uaaKwAaQVFS2Z5o6JPoM/788687f62d13fdfd3afd71639dcea271/apex-grid-tile-legends-Bangalore.jpg'),
  ('bloodhound', 'https://drop-assets.ea.com/images/57Lw4lAodWsiNYTO1zvT6I/ec740d776b1d24172f5c9ed65f6d71af/apex-grid-tile-legends-Bloodhound.jpg'),
  ('catalyst', 'https://drop-assets.ea.com/images/I01amfukfvzrqbSSg1xQB/6147400ff2102b3ddd5f5c931a374be8/apex-grid-tile-legends-Catalyst.jpg'),
  ('caustic', 'https://drop-assets.ea.com/images/30vsaqTmflB9MEo7GTcgXB/96eb6e78a15a275cd7e85040986985f8/apex-grid-tile-legends-Caustic.jpg'),
  ('conduit', 'https://drop-assets.ea.com/images/4Ksr2ZX6ImduJHxxeYONtU/277537c176c74b951319f92d86f4698e/apex-grid-tile-legends-Conduit.jpg'),
  ('crypto', 'https://drop-assets.ea.com/images/xnWqynrhqueemWjVw44E9/a39d43a0bf4d58a040f3d1a51815f899/apex-grid-tile-legends-Crypto.jpg'),
  ('fuse', 'https://drop-assets.ea.com/images/1ed5jzmnEE2F3VYADHiAb1/e2a5e038f7fe26d8cd1b6eab882e5247/apex-grid-tile-legends-Fuse.jpg'),
  ('gibraltar', 'https://drop-assets.ea.com/images/2uZ8i6QAJcG0twyVOIjC5S/80185d7d5cd8373684bf268c13f07fe0/apex-grid-tile-legends-Gibraltar.jpg'),
  ('horizon', 'https://drop-assets.ea.com/images/3wEl6hnRZRfE0kpIhHe16Y/3dc98b90c70516c9a3ee563586c28d63/apex-grid-tile-legends-Horizon.jpg'),
  ('lifeline', 'https://drop-assets.ea.com/images/2CB26KqVrs5AahlXuSCSgl/c1b815b029a81b654a1ea34497cf8926/apex-grid-tile-legends-Lifeline.jpg'),
  ('loba', 'https://drop-assets.ea.com/images/5sYrsr2r1tJSjCGM9nwODq/40d430203a315af1900431e26a288619/apex-grid-tile-legends-Loba.jpg'),
  ('mad-maggie', 'https://drop-assets.ea.com/images/4X6EN7HLCByvyHbSVi5I6C/c881852cfd2ca864f578134212a23d55/apex-grid-tile-legends-MadMaggie.jpg'),
  ('mirage', 'https://drop-assets.ea.com/images/JVVgPeCz9D5hCuzdltvTW/8de2e63ef240ab578ff2cab7905918c9/apex-grid-tile-legends-Mirage.jpg'),
  ('newcastle', 'https://drop-assets.ea.com/images/2aqce7tHWCzjdVxcHl0iaS/dd4e76b7c8b007d5bcde01d4e4cae00f/apex-grid-tile-legends-Newcastle.jpg'),
  ('octane', 'https://drop-assets.ea.com/images/15R4OhvkVEF8UgnM2x6iGO/cbfbadf786010c548a900b7cb2cc5960/apex-grid-tile-legends-Octane.jpg'),
  ('pathfinder', 'https://drop-assets.ea.com/images/6zanV6x46IQntfmXVJuxWs/08090312744a04dc243b138d0e8fe72a/apex-grid-tile-legends-Pathfinder.jpg'),
  ('rampart', 'https://drop-assets.ea.com/images/21QdZAxCn7qZWCLNPR4X3C/ec7c5e4cbf7a2aad48702b4fb4103878/apex-grid-tile-legends-Rampart.jpg'),
  ('revenant', 'https://drop-assets.ea.com/images/40px8AHVKdZDFzG0v2IHSl/ae12ef0b2b3aa82d113d06f78885b345/apex-grid-tile-legends-Revenant.jpg'),
  ('seer', 'https://drop-assets.ea.com/images/4Lv7MVV4qMAK4elah1iZoz/10466b756099f26a00aff51cf23bd2f0/apex-grid-tile-legends-Seer.jpg'),
  ('sparrow', 'https://drop-assets.ea.com/images/ZpRorS2mnGb98mIt53sy9/0962732ad880c5f42754776e035316cc/apex-grid-tile-legends-sparrow.jpg'),
  ('valkyrie', 'https://drop-assets.ea.com/images/4FPEvAK1WOqJbMeQhaaGkq/cf3a24ed788f219b79974f20c1ef84f8/apex-grid-tile-legends-Valkyrie.jpg'),
  ('vantage', 'https://drop-assets.ea.com/images/6wNJrehz7BfFeKFwWINpCD/e25ce64fad589ca8fee6e4024119cd92/apex-grid-tile-legends-Vantage.jpg'),
  ('wattson', 'https://drop-assets.ea.com/images/35A7Ebi3AQ5jtXhZlXcgfm/ddc8902fd90e0cf669e9ce4182ab8e1f/apex-grid-tile-legends-Wattson.jpg'),
  ('wraith', 'https://drop-assets.ea.com/images/4J0UloeNHP6KD21QNrgMcj/cec0cb8949bb3cfe2149a6ca7c2d8a5d/apex-grid-tile-legends-Wraith.jpg')
) as v(slug, url)
where c.game_id = 'apex' and c.slug = v.slug;
