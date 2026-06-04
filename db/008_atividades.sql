-- =================================================================
-- CRM Baldada — Migration 008: histórico de atividades
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

CREATE TABLE IF NOT EXISTS public.atividades (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id      uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  user_id        uuid NOT NULL REFERENCES auth.users(id),
  tipo           text NOT NULL CHECK (tipo IN ('ligacao','whatsapp','email','reuniao','anotacao','visita')),
  descricao      text NOT NULL,
  data_atividade timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_atividades_pessoa ON public.atividades(pessoa_id);
CREATE INDEX IF NOT EXISTS idx_atividades_data   ON public.atividades(data_atividade DESC);

ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "ativ_select" ON public.atividades;
DROP POLICY IF EXISTS "ativ_insert" ON public.atividades;
DROP POLICY IF EXISTS "ativ_delete" ON public.atividades;

CREATE POLICY "ativ_select" ON public.atividades FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

CREATE POLICY "ativ_insert" ON public.atividades FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "ativ_delete" ON public.atividades FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

SELECT 'atividades' AS tabela, COUNT(*) AS rows FROM public.atividades;
