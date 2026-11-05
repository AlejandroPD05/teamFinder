-- Multijuego: tema visual y textos por juego como datos del catálogo.
-- Los colores son acentos propios inspirados en cada juego, no sus colores de marca (políticas de Riot y prompt §17:
-- la base oscura es común; solo cambian acentos y brillos).

alter table public.games
  add column short_name text,
  add column character_label text,          -- «Agentes», «Leyendas»… null si el juego no tiene personajes
  add column theme_accent text check (theme_accent ~ '^#[0-9a-f]{6}$'),
  add column theme_accent_soft text check (theme_accent_soft ~ '^#[0-9a-f]{6}$'),
  add column theme_glow_a text check (theme_glow_a ~ '^#[0-9a-f]{6}$'),
  add column theme_glow_b text check (theme_glow_b ~ '^#[0-9a-f]{6}$');

update public.games set short_name = 'VALORANT', character_label = 'Agentes',
  theme_accent = '#ff6b6b', theme_accent_soft = '#ff9e9e', theme_glow_a = '#ff6b6b', theme_glow_b = '#1e3a6e'
where id = 'valorant';
