-- =================================================================
-- CRM Baldada — Migration 007
-- Cria tabela reunioes (se não existir) e proximos_passos
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

-- ========== 1. Tabela reunioes ==========
CREATE TABLE IF NOT EXISTS public.reunioes (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id           uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  user_id             uuid NOT NULL REFERENCES auth.users(id),
  calendar_event_id   text NULL,
  tipo                text NOT NULL CHECK (tipo IN ('analise','c1','c2','c3','c4','fechamento')),
  data_reuniao        timestamptz NULL,
  transcricao         text NULL,
  relatorio           text NULL,
  relatorio_gerado_em timestamptz NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reunioes_pessoa ON public.reunioes(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_reunioes_user   ON public.reunioes(user_id);

-- RLS
ALTER TABLE public.reunioes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "reunioes_select" ON public.reunioes;
DROP POLICY IF EXISTS "reunioes_insert" ON public.reunioes;
DROP POLICY IF EXISTS "reunioes_update" ON public.reunioes;
DROP POLICY IF EXISTS "reunioes_delete" ON public.reunioes;

-- Líderes veem tudo; consultor vê só as suas
CREATE POLICY "reunioes_select" ON public.reunioes FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

CREATE POLICY "reunioes_insert" ON public.reunioes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "reunioes_update" ON public.reunioes FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

CREATE POLICY "reunioes_delete" ON public.reunioes FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

-- ========== 2. Tabela proximos_passos ==========
CREATE TABLE IF NOT EXISTS public.proximos_passos (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id    uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  user_id      uuid NOT NULL REFERENCES auth.users(id),
  descricao    text NOT NULL,
  data_prevista date NULL,
  feito        boolean NOT NULL DEFAULT false,
  feito_em     timestamptz NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_proximos_pessoa ON public.proximos_passos(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_proximos_user   ON public.proximos_passos(user_id);

-- RLS
ALTER TABLE public.proximos_passos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "proximos_select" ON public.proximos_passos;
DROP POLICY IF EXISTS "proximos_insert" ON public.proximos_passos;
DROP POLICY IF EXISTS "proximos_update" ON public.proximos_passos;
DROP POLICY IF EXISTS "proximos_delete" ON public.proximos_passos;

-- Líderes veem tudo; consultor vê os seus
CREATE POLICY "proximos_select" ON public.proximos_passos FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

-- Qualquer autenticado pode inserir (líderes também adicionam para o consultor)
CREATE POLICY "proximos_insert" ON public.proximos_passos FOR INSERT
  WITH CHECK (auth.uid() = auth.uid());

CREATE POLICY "proximos_update" ON public.proximos_passos FOR UPDATE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

CREATE POLICY "proximos_delete" ON public.proximos_passos FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

-- ========== 3. Conferência ==========
SELECT
  'reunioes' AS tabela,
  (SELECT COUNT(*) FROM public.reunioes) AS rows
UNION ALL
SELECT
  'proximos_passos' AS tabela,
  (SELECT COUNT(*) FROM public.proximos_passos) AS rows;
