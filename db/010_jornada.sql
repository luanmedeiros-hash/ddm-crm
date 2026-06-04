-- =================================================================
-- CRM Baldada — Migration 010: jornada do cliente
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

-- 1. Adiciona acompanhamento ao CHECK de reunioes
ALTER TABLE public.reunioes
  DROP CONSTRAINT IF EXISTS reunioes_tipo_check;

ALTER TABLE public.reunioes
  ADD CONSTRAINT reunioes_tipo_check
  CHECK (tipo IN ('analise','c1','c2','c3','c4','fechamento','acompanhamento'));

-- 2. Data de fechamento em pessoas (quando o lead virou cliente)
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS data_fechamento date NULL;

-- 3. Confirência
SELECT column_name FROM information_schema.columns
WHERE table_name = 'pessoas' AND column_name = 'data_fechamento';
