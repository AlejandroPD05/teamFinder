-- Karma solo positivo («reconocimientos»): la política de Riot para productos con su API prohíbe
-- evaluar o avergonzar a otros jugadores, pero permite honrarlos. Se eliminan votos y etiquetas negativos.
delete from public.karma_votes where value = -1;
update public.karma_votes set tags = array_remove(array_remove(tags, 'toxico'), 'no_aparecio');
alter table public.karma_votes drop constraint karma_votes_value_check;
alter table public.karma_votes add constraint karma_votes_value_check check (value = 1);
alter table public.karma_votes drop constraint karma_votes_tags_check;
alter table public.karma_votes add constraint karma_votes_tags_check
  check (cardinality(tags) <= 3 and tags <@ array['buen_companero','comunicativo','buen_ambiente','puntual']);
