-- =================================================================
-- CRM Baldada — Migration 014: pontos da ligação (leads)
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS pontos_ligacao text NULL;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'pessoas' AND column_name = 'pontos_ligacao';
