-- Rediseño: iconos de agentes y rangos como datos del catálogo + nuevo agente (Hush).

alter table public.game_characters add column icon_url text
  check (icon_url is null or icon_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$');
alter table public.game_ranks add column icon_url text
  check (icon_url is null or icon_url ~ '^https://media\.valorant-api\.com/[A-Za-z0-9/_.\-]+\.png$');
alter table public.game_ranks add column color text check (color is null or color ~ '^#[0-9a-f]{6}$');

-- Hush (Duelista), presente en los archivos del juego según valorant-api.com (2026-11-05).
insert into public.game_characters (game_id, role_id, slug, name)
select 'valorant', r.id, 'hush', 'Hush' from public.game_roles r where r.game_id = 'valorant' and r.slug = 'duelist'
on conflict (game_id, slug) do nothing;

-- Iconos de agentes y rangos (recursos de Riot Games servidos por valorant-api.com; política «Legal Jibber Jabber»).
-- Datos generados el 2026-11-05 desde valorant-api.com/v1/agents y /v1/competitivetiers (último conjunto de rangos).
update public.game_characters c set icon_url = v.url
from (values
  ('gekko', 'https://media.valorant-api.com/agents/e370fa57-4757-3604-3648-499e1f642d3f/displayicon.png'),
  ('fade', 'https://media.valorant-api.com/agents/dade69b4-4f5a-8528-247b-219e5a1facd6/displayicon.png'),
  ('breach', 'https://media.valorant-api.com/agents/5f8d3a7f-467b-97f3-062c-13acf203c006/displayicon.png'),
  ('deadlock', 'https://media.valorant-api.com/agents/cc8b64c8-4b25-4ff9-6e7f-37b4da43d235/displayicon.png'),
  ('tejo', 'https://media.valorant-api.com/agents/b444168c-4e35-8076-db47-ef9bf368f384/displayicon.png'),
  ('raze', 'https://media.valorant-api.com/agents/f94c3b30-42be-e959-889c-5aa313dba261/displayicon.png'),
  ('chamber', 'https://media.valorant-api.com/agents/22697a3d-45bf-8dd7-4fec-84a9e28c69d7/displayicon.png'),
  ('kayo', 'https://media.valorant-api.com/agents/601dbbe7-43ce-be57-2a40-4abd24953621/displayicon.png'),
  ('skye', 'https://media.valorant-api.com/agents/6f2a04ca-43e0-be17-7f36-b3908627744d/displayicon.png'),
  ('cypher', 'https://media.valorant-api.com/agents/117ed9e3-49f3-6512-3ccf-0cada7e3823b/displayicon.png'),
  ('sova', 'https://media.valorant-api.com/agents/320b2a48-4d9b-a075-30f1-1f93a9b638fa/displayicon.png'),
  ('miks', 'https://media.valorant-api.com/agents/7c8a4701-4de6-9355-b254-e09bc2a34b72/displayicon.png'),
  ('killjoy', 'https://media.valorant-api.com/agents/1e58de9c-4950-5125-93e9-a0aee9f98746/displayicon.png'),
  ('harbor', 'https://media.valorant-api.com/agents/95b78ed7-4637-86d9-7e41-71ba8c293152/displayicon.png'),
  ('vyse', 'https://media.valorant-api.com/agents/efba5359-4016-a1e5-7626-b1ae76895940/displayicon.png'),
  ('viper', 'https://media.valorant-api.com/agents/707eab51-4836-f488-046a-cda6bf494859/displayicon.png'),
  ('hush', 'https://media.valorant-api.com/agents/ddd5a15c-4fbe-42fa-3789-11a55ca5ee04/displayicon.png'),
  ('phoenix', 'https://media.valorant-api.com/agents/eb93336a-449b-9c1b-0a54-a891f7921d69/displayicon.png'),
  ('veto', 'https://media.valorant-api.com/agents/92eeef5d-43b5-1d4a-8d03-b3927a09034b/displayicon.png'),
  ('astra', 'https://media.valorant-api.com/agents/41fb69c1-4189-7b37-f117-bcaf1e96f1bf/displayicon.png'),
  ('brimstone', 'https://media.valorant-api.com/agents/9f0d8ba9-4140-b941-57d3-a7ad57c6b417/displayicon.png'),
  ('iso', 'https://media.valorant-api.com/agents/0e38b510-41a8-5780-5e8f-568b2a4f2d6c/displayicon.png'),
  ('clove', 'https://media.valorant-api.com/agents/1dbf2edd-4729-0984-3115-daa5eed44993/displayicon.png'),
  ('neon', 'https://media.valorant-api.com/agents/bb2a4828-46eb-8cd1-e765-15848195d751/displayicon.png'),
  ('yoru', 'https://media.valorant-api.com/agents/7f94d92c-4234-0a36-9646-3a87eb8b5c89/displayicon.png'),
  ('waylay', 'https://media.valorant-api.com/agents/df1cb487-4902-002e-5c17-d28e83e78588/displayicon.png'),
  ('sage', 'https://media.valorant-api.com/agents/569fdd95-4d10-43ab-ca70-79becc718b46/displayicon.png'),
  ('reyna', 'https://media.valorant-api.com/agents/a3bfb853-43b2-7238-a4f1-ad90e9e46bcc/displayicon.png'),
  ('omen', 'https://media.valorant-api.com/agents/8e253930-4c05-31dd-1b6c-968525494517/displayicon.png'),
  ('jett', 'https://media.valorant-api.com/agents/add6443a-41bd-e414-f6ad-e58d267f4e95/displayicon.png')
) as v(slug, url)
where c.game_id = 'valorant' and c.slug = v.slug;

update public.game_ranks r set icon_url = v.url, color = v.color
from (values
  ('iron-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/3/smallicon.png', '#868986'),
  ('iron-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/4/smallicon.png', '#868986'),
  ('iron-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/5/smallicon.png', '#868986'),
  ('bronze-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/6/smallicon.png', '#a5855d'),
  ('bronze-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/7/smallicon.png', '#a5855d'),
  ('bronze-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/8/smallicon.png', '#a5855d'),
  ('silver-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/9/smallicon.png', '#bbc2c2'),
  ('silver-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/10/smallicon.png', '#bbc2c2'),
  ('silver-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/11/smallicon.png', '#bbc2c2'),
  ('gold-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/12/smallicon.png', '#eccf56'),
  ('gold-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/13/smallicon.png', '#eccf56'),
  ('gold-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/14/smallicon.png', '#eccf56'),
  ('platinum-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/15/smallicon.png', '#59a9b6'),
  ('platinum-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/16/smallicon.png', '#59a9b6'),
  ('platinum-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/17/smallicon.png', '#59a9b6'),
  ('diamond-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/18/smallicon.png', '#b489c4'),
  ('diamond-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/19/smallicon.png', '#b489c4'),
  ('diamond-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/20/smallicon.png', '#b489c4'),
  ('ascendant-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/21/smallicon.png', '#6ae2af'),
  ('ascendant-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/22/smallicon.png', '#6ae2af'),
  ('ascendant-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/23/smallicon.png', '#6ae2af'),
  ('immortal-1', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/24/smallicon.png', '#bb3d65'),
  ('immortal-2', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/25/smallicon.png', '#bb3d65'),
  ('immortal-3', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/26/smallicon.png', '#bb3d65'),
  ('radiant', 'https://media.valorant-api.com/competitivetiers/03621f52-342b-cf4e-4f86-9350a49c6d04/27/smallicon.png', '#ffffaa')
) as v(slug, url, color)
where r.game_id = 'valorant' and r.slug = v.slug;
