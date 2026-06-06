-- =================================================================
-- CRM Baldada — Migration 017: metas mensais por consultor
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

CREATE TABLE IF NOT EXISTS public.metas (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id           uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  mes               text NOT NULL,           -- 'YYYY-MM'
  meta_analises     int NOT NULL DEFAULT 0,
  meta_consultorias int NOT NULL DEFAULT 0,
  meta_fechamentos  int NOT NULL DEFAULT 0,
  updated_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, mes)
);

ALTER TABLE public.metas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "metas_select" ON public.metas;
DROP POLICY IF EXISTS "metas_upsert" ON public.metas;
DROP POLICY IF EXISTS "metas_update" ON public.metas;

CREATE POLICY "metas_select" ON public.metas FOR SELECT
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider'));

CREATE POLICY "metas_upsert" ON public.metas FOR INSERT
  WITH CHECK (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider'));

CREATE POLICY "metas_update" ON public.metas FOR UPDATE
  USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider'));

SELECT 'tabela metas criada' AS status;
