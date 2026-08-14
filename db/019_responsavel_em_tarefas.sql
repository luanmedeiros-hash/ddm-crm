-- Baldada — 019: responsavel em pendencias e proximos_passos
--
-- Contexto: separar tarefas do consultor ("suas") das tarefas do cliente
-- ("dele") dentro da ficha do cliente. Hoje as duas tabelas não distinguem
-- quem é o responsável, então tudo aparece misturado.
--
-- Valor default = 'consultor' porque:
--   1. É o comportamento mais comum (você é quem toma nota depois da reunião)
--   2. Dados existentes ficam classificados corretamente sem migração de dados
--
-- Rodar no Supabase SQL Editor.

do $$ begin
  create type public.tarefa_responsavel as enum ('consultor', 'cliente');
exception
  when duplicate_object then null;
end $$;

alter table public.pendencias
  add column if not exists responsavel public.tarefa_responsavel
    not null default 'consultor';

comment on column public.pendencias.responsavel is
  'Quem é responsável por resolver: consultor (você) ou cliente. Separa "minhas tarefas" de "tarefas dele" na ficha.';

alter table public.proximos_passos
  add column if not exists responsavel public.tarefa_responsavel
    not null default 'consultor';

comment on column public.proximos_passos.responsavel is
  'Quem é responsável pelo próximo passo: consultor (você) ou cliente.';

-- Índice pra filtrar rápido "pendências do cliente X para o consultor" e
-- "pendências do cliente X para o cliente" na ficha do drawer.
create index if not exists pendencias_pessoa_responsavel_idx
  on public.pendencias (pessoa_id, responsavel, status);

create index if not exists proximos_passos_pessoa_responsavel_idx
  on public.proximos_passos (pessoa_id, responsavel, feito);
