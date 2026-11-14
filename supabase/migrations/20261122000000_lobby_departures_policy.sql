-- `lobby_departures`: RLS sin políticas es a propósito (solo la leen funciones de `private` para la fiabilidad); se deja
-- explícito para que el asesor de Supabase no avise (lint 0008), igual que `app_admins`.
create policy "lobby_departures no access from the api" on public.lobby_departures for select to anon, authenticated using (false);
