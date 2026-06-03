-- =================================================================
-- CRM Baldada — Migration 006
-- Tabela `consultores`: fonte de verdade da LISTA de consultores,
-- gerenciavel pela tela de gestao (so lider). Permite pre-cadastro
-- (consultor existe na lista antes mesmo de logar pela 1a vez).
-- =================================================================
-- Como rodar:
--   1. CONFIRMAR no topo do Supabase que o projeto e o TEAMIRES
--      (bbjiqpvjufkbyfvnydth) — NAO o Baldada.
--   2. Supabase Dashboard -> SQL Editor -> New query
--   3. Cole TODO este arquivo -> Run
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =================================================================

-- ========== 0. CONFERENCIA DE PROJETO (rode estas 2 linhas ANTES, isoladas) ==========
-- SELECT current_database();
-- SELECT count(*) FROM public.profiles;   -- esperado 15 no Baldada

-- ========== 1. Tabela ==========
CREATE TABLE IF NOT EXISTS public.consultores (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome        text NOT NULL,
  email       text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'liderado' CHECK (role IN ('lider', 'liderado')),
  ativo       boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_consultores_email ON public.consultores(lower(email));
CREATE INDEX IF NOT EXISTS idx_consultores_ativo ON public.consultores(ativo);

-- ========== 2. RLS ==========
ALTER TABLE public.consultores ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas pra evitar duplicacao (idempotente)
DROP POLICY IF EXISTS consultores_select       ON public.consultores;
DROP POLICY IF EXISTS consultores_insert_lider ON public.consultores;
DROP POLICY IF EXISTS consultores_update_lider ON public.consultores;

-- SELECT: qualquer logado le (telas precisam da lista). Padrao do projeto.
CREATE POLICY consultores_select ON public.consultores
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- INSERT: so lider. O EXISTS consulta `profiles` (tabela diferente) ->
-- NAO causa recursao de RLS (recursao seria policy de profiles lendo profiles).
CREATE POLICY consultores_insert_lider ON public.consultores
  FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

-- UPDATE: so lider (inclui ativar/desativar via soft-delete `ativo`).
CREATE POLICY consultores_update_lider ON public.consultores
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

-- (Sem policy de DELETE de proposito: desativar usa ativo=false, nunca delete fisico.)

-- ========== 3. Seed: consultores atuais ==========
-- Espelha a constante CONSULTORES + emails conhecidos do mapa 002.
-- ON CONFLICT (email) DO NOTHING: nao sobrescreve quem ja existe.
INSERT INTO public.consultores (nome, email, role) VALUES
  ('Amanda Lara',                'amanda.lara.w1@gmail.com',        'liderado'),
  ('Catarina Heloisa Fernandes', 'catarinafernandes.w1@gmail.com',  'liderado'),
  ('Flávia Viliotti',            'flaviaviliotti.w1@gmail.com',     'liderado'),
  ('Guilherme Scafi',            'guilherme.scafi.w1@gmail.com',    'liderado'),
  ('Letícia Castro',             'leticiacastro.w1@gmail.com',      'liderado'),
  ('Luiza Vilela',               'luizavilela.w1@gmail.com',        'liderado'),
  ('Maria Júlia Maral',          'mariajuliamaral.w1@gmail.com',    'liderado'),
  ('Paulo Vítor Cezario',        'paulovitorcezario.w1@gmail.com',  'liderado'),
  ('Tamires Oliveira',           'tamiresoliveira.w1@gmail.com',    'liderado'),
  ('Viviane Dornelas',           'vivianedornelas.w1@gmail.com',    'liderado')
ON CONFLICT (email) DO NOTHING;

-- ========== 4. Conferencia ==========
SELECT nome, email, role, ativo
FROM public.consultores
ORDER BY nome;
