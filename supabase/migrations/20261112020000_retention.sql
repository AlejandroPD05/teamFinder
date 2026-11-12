-- Plazos de conservación de la política de privacidad (/privacidad), aplicados cada día con pg_cron:
--   · Mensajes del chat de un grupo: 30 días desde que se cierra el grupo.
--   · Denuncias archivadas sin medida: 6 meses desde que se resuelven; con medida: 12 meses.
--   · Registro de moderación: 12 meses.
-- Las denuncias abiertas no se tocan. Las que estén en manos de las autoridades se excluyen marcándolas a mano
-- (resolution empieza por «[retener]»).

create extension if not exists pg_cron;

create function private.purge_expired() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare msgs int; reps int; logs int;
begin
  delete from public.lobby_messages m
  using public.lobbies l
  where m.lobby_id = l.id and l.status = 'closed' and l.closed_at < now() - interval '30 days';
  get diagnostics msgs = row_count;

  delete from public.reports
  where status <> 'open'
    and coalesce(resolution, '') not like '[retener]%'
    and reviewed_at < now() - case when status = 'dismissed' then interval '6 months' else interval '12 months' end;
  get diagnostics reps = row_count;

  delete from public.moderation_log where created_at < now() - interval '12 months';
  get diagnostics logs = row_count;

  return jsonb_build_object('messages', msgs, 'reports', reps, 'moderation_log', logs);
end $$;
revoke execute on function private.purge_expired() from public, anon, authenticated;

-- Todos los días a las 04:15 UTC. Si ya existe (p. ej. al reaplicar), se reemplaza.
select cron.schedule('purge-expired', '15 4 * * *', 'select private.purge_expired()');
