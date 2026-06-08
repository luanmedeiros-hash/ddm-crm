-- 019_schema_report.sql
-- Função usada pelo script `npm run db:check` para inspecionar o schema
-- real e comparar com o que o app espera. Rodar uma vez no SQL Editor.

create or replace function public.app_schema_report()
returns table (
  table_name text,
  column_name text,
  data_type text,
  is_nullable text,
  has_default boolean
)
language sql
security definer
set search_path = public
as $$
  select
    c.table_name::text,
    c.column_name::text,
    c.data_type::text,
    c.is_nullable::text,
    (c.column_default is not null) as has_default
  from information_schema.columns c
  where c.table_schema = 'public'
    and c.table_name in ('registros_daily','profiles','pessoas','reunioes','proximos_passos','atividades','metas')
  order by c.table_name, c.ordinal_position;
$$;

-- Permite que o service_role (usado pelo script) chame a função.
grant execute on function public.app_schema_report() to service_role;
