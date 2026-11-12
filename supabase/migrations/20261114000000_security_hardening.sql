-- Endurecimiento según los avisos de seguridad de Supabase (splinter):
--
-- 1) Funciones SECURITY DEFINER en `public` (avisos 0028/0029): la lógica con privilegios pasa al esquema `private`,
--    que la API no expone. En `public` queda un envoltorio SECURITY INVOKER con la misma firma y los mismos permisos,
--    así la web y los tests siguen llamando igual (`rpc("…")`). Las políticas RLS y los triggers que usaban las
--    funciones movidas siguen apuntando a ellas (se guardan por OID).
-- 2) Vistas SECURITY DEFINER (aviso 0010): la vista con privilegios (que aplica la visibilidad por campo y los
--    bloqueos) pasa a `private`; en `public` queda una vista SECURITY INVOKER que la lee. Los filtros siguen
--    llegando a las tablas (las vistas se expanden), sin coste de rendimiento.
-- 3) pg_net fuera de `public` (aviso 0014).
-- 4) `app_admins`: RLS sin políticas es a propósito (solo la clave de servicio); se deja explícito (aviso 0008).
--
-- Regla para migraciones futuras: nada SECURITY DEFINER en `public`. Crear la función o vista en `private` y, si la
-- web la necesita, un envoltorio SECURITY INVOKER en `public` (ver `private.expose_function`).

-- ---------- 1) Funciones ----------

-- Crea en `public` el envoltorio SECURITY INVOKER de `private.<nombre>` con los mismos argumentos (y valores por
-- defecto), el mismo resultado y la misma volatilidad, y le copia los permisos de ejecución de la función privada.
create function private.expose_function(p_fn regprocedure) returns void
language plpgsql set search_path = '' as $$
declare
  f record;
  call_args text;
  body text;
  r text;
begin
  select p.proname, pg_get_function_arguments(p.oid) as args, pg_get_function_identity_arguments(p.oid) as idargs,
         pg_get_function_result(p.oid) as res,
         p.proretset, p.provolatile, p.proargnames, p.proargmodes, p.pronargs
  into f
  from pg_proc p where p.oid = p_fn;

  -- Solo los argumentos de entrada, por nombre (los de salida de RETURNS TABLE no se pasan).
  call_args := '';
  if f.proargnames is not null then
    select coalesce(string_agg(format('%1$I => %1$I', a.name), ', ' order by a.ord), '')
    into call_args
    from unnest(f.proargnames, coalesce(f.proargmodes, array_fill('i'::"char", array[cardinality(f.proargnames)])))
         with ordinality as a(name, mode, ord)
    where a.mode in ('i', 'b', 'v');
  end if;
  if f.pronargs > 0 and call_args = '' then
    raise exception 'La función % necesita argumentos con nombre', p_fn;
  end if;

  body := case when f.proretset then format('select * from private.%I(%s)', f.proname, call_args)
               else format('select private.%I(%s)', f.proname, call_args) end;

  execute format(
    'create function public.%I(%s) returns %s language sql %s security invoker set search_path = '''' as %L',
    f.proname, f.args, f.res,
    case f.provolatile when 'i' then 'immutable' when 's' then 'stable' else 'volatile' end,
    body);

  -- Mismos permisos que la función privada (Supabase da EXECUTE a anon y authenticated por defecto en `public`).
  execute format('revoke all on function public.%I(%s) from public, anon, authenticated', f.proname, f.idargs);
  foreach r in array array['anon', 'authenticated', 'service_role'] loop
    if has_function_privilege(r, p_fn, 'execute') then
      execute format('grant execute on function public.%I(%s) to %I', f.proname, f.idargs, r);
    end if;
  end loop;
end $$;
revoke execute on function private.expose_function(regprocedure) from public, anon, authenticated;

do $$
declare fn record; moved regprocedure;
begin
  for fn in
    select p.oid, p.proname, pg_get_function_identity_arguments(p.oid) as idargs, p.prorettype = 'trigger'::regtype as is_trigger
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef and p.prokind = 'f'
  loop
    execute format('alter function public.%I(%s) set schema private', fn.proname, fn.idargs);
    moved := fn.oid::regprocedure;
    if fn.is_trigger then
      -- Las funciones de trigger no se llaman desde la API: nadie necesita EXECUTE.
      execute format('revoke execute on function private.%I(%s) from public, anon, authenticated', fn.proname, fn.idargs);
    else
      perform private.expose_function(moved);
    end if;
  end loop;
end $$;

-- ---------- 2) Vistas ----------
do $$
declare v record; r text;
begin
  for v in
    select c.oid, c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce((select option_value::boolean from pg_options_to_table(c.reloptions) where option_name = 'security_invoker'), false)
  loop
    execute format('alter view public.%I set schema private', v.relname);
    execute format('create view public.%1$I with (security_invoker = true) as select * from private.%1$I', v.relname);
    execute format('revoke all on public.%I from public, anon, authenticated', v.relname);
    foreach r in array array['anon', 'authenticated'] loop
      if has_table_privilege(r, v.oid, 'select') then
        execute format('grant select on public.%I to %I', v.relname, r);
      end if;
    end loop;
  end loop;
end $$;

-- ---------- 3) pg_net en su propio esquema ----------
-- pg_net no se puede mover (no es reubicable): se reinstala en `extensions`. Sus funciones siguen en `net`.
drop extension if exists pg_net;
create extension pg_net with schema extensions;

-- ---------- 4) app_admins ----------
create policy "app_admins no access from the api" on public.app_admins for select to anon, authenticated using (false);
