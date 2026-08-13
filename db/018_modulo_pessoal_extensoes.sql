-- Baldada — Módulo pessoal (v1)
-- Extensões nas tabelas EXISTENTES pra suportar preparação de reuniões e
-- contexto rápido de cliente. Não cria tabela nova.
--
-- Semântica reafirmada (não muda com este migration):
--   pessoas          = clientes / leads
--   profiles         = consultores (linka com auth.users)
--   reunioes         = reunião formal com cliente
--   atividades       = interações rápidas (ligação, e-mail, whatsapp)
--   pendencias       = tarefas atrasadas / que ficaram pra trás
--   proximos_passos  = tarefas futuras / action items combinados
--   c1..c4           = etapas da consultoria pós-fechamento
--
-- Compromissos institucionais ficam pra migration futura.

-- =========================================================================
-- pessoas: contexto rápido + tags pessoais
-- =========================================================================

-- Contexto rápido: 3-5 linhas que você lê nos minutos antes da call.
-- Fica separado de `notas` (que provavelmente é histórico livre e sujo).
alter table public.pessoas
  add column if not exists contexto_rapido text;

comment on column public.pessoas.contexto_rapido is
  'Resumo curto (3-5 linhas) para preparação rápida antes de calls. Distinto de notas, que é histórico livre.';

-- Tags pessoais do consultor sobre o cliente.
-- Distinto de `produtos` (que é o que o cliente tem contratado).
alter table public.pessoas
  add column if not exists tags text[] not null default '{}'::text[];

comment on column public.pessoas.tags is
  'Tags livres do consultor (ex.: "perfil conservador", "fase pré-aposentadoria"). Distinto de produtos.';

-- =========================================================================
-- reunioes: título + notas de preparação
-- =========================================================================

-- Título da reunião. Necessário porque hoje só existe `resumo` (pós-reunião)
-- e precisamos identificar a reunião antes de ela acontecer.
alter table public.reunioes
  add column if not exists titulo text;

comment on column public.reunioes.titulo is
  'Assunto/título da reunião. Preenchido no agendamento, antes do resumo pós-reunião.';

-- Notas de preparação: o que você planeja levantar/perguntar ANTES.
alter table public.reunioes
  add column if not exists prep_notes text;

comment on column public.reunioes.prep_notes is
  'Anotações de preparação feitas ANTES da reunião. Complementa `resumo`, que é o registro pós-reunião.';

-- =========================================================================
-- Índices úteis para a home "Hoje + essa semana"
-- =========================================================================

-- Reuniões próximas por consultor: precisa passar por pessoas.user_id.
-- Índice em (pessoa_id, data) acelera o join + filtro por data.
create index if not exists reunioes_pessoa_data_idx
  on public.reunioes (pessoa_id, data desc);

-- Pendências abertas por prazo.
create index if not exists pendencias_status_prazo_idx
  on public.pendencias (status, prazo)
  where status = 'aberta';

-- Próximos passos não concluídos por data prevista.
create index if not exists proximos_passos_pendentes_idx
  on public.proximos_passos (user_id, data_prevista)
  where feito = false;
