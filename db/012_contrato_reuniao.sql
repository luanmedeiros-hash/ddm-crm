-- =================================================================
-- CRM Baldada — Migration 012: contrato e apólice em reunioes
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

ALTER TABLE public.reunioes
  ADD COLUMN IF NOT EXISTS contrato_gerado boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS apolice_path    text    NULL,
  ADD COLUMN IF NOT EXISTS apolice_nome    text    NULL;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'reunioes'
  AND column_name IN ('contrato_gerado','apolice_path','apolice_nome');
