-- Comprobación de seguridad del esquema (CI). Falla si aparece algo que los avisos de seguridad de Supabase marcarían:
--   - funciones SECURITY DEFINER en `public` (la API las expone: van en `private` con un envoltorio invoker),
--   - vistas de `public` sin security_invoker,
--   - tablas de `public` sin RLS,
--   - funciones de `public` sin search_path fijo,
--   - extensiones instaladas en `public`,
--   - claves foráneas sin índice (rendimiento: borrados en cascada y filtros).
do $$
declare problems text[];
begin
  select array_agg(x) into problems from (
    select 'función SECURITY DEFINER en public: ' || p.oid::regprocedure::text as x
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.prosecdef
    union all
    select 'vista sin security_invoker: public.' || c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'v'
      and not coalesce((select option_value::boolean from pg_options_to_table(c.reloptions)
                        where option_name = 'security_invoker'), false)
    union all
    select 'tabla sin RLS: public.' || c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity
    union all
    select 'función sin search_path fijo: ' || p.oid::regprocedure::text
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    left join pg_depend d on d.objid = p.oid and d.deptype = 'e'
    where n.nspname = 'public' and d.objid is null
      and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%')
    union all
    select 'extensión en public: ' || e.extname
    from pg_extension e join pg_namespace n on n.oid = e.extnamespace
    where n.nspname = 'public'
    union all
    select 'clave foránea sin índice: ' || c.conrelid::regclass::text || ' (' || c.conname || ')'
    from pg_constraint c join pg_namespace n on n.oid = c.connamespace
    where c.contype = 'f' and n.nspname = 'public'
      and not exists (select 1 from pg_index i where i.indrelid = c.conrelid
                      and (i.indkey::int2[])[0:cardinality(c.conkey) - 1] = c.conkey)
  ) t;
  if problems is not null then
    raise exception E'Problemas de seguridad en el esquema:\n%', array_to_string(problems, E'\n');
  end if;
  raise notice 'Esquema sin avisos de seguridad.';
end $$;
