-- Avisos en directo: las notificaciones nuevas llegan por Realtime a su destinatario (la RLS «notifications own»
-- decide quién recibe cada fila), así la campana y el aviso emergente se actualizan sin recargar.
alter publication supabase_realtime add table public.notifications;
