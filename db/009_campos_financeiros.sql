-- =================================================================
-- CRM Baldada — Migration 009: campos financeiros em pessoas
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS patrimonio       numeric        NULL,
  ADD COLUMN IF NOT EXISTS renda_mensal     numeric        NULL,
  ADD COLUMN IF NOT EXISTS perfil_risco     text           NULL CHECK (perfil_risco IN ('conservador','moderado','arrojado','agressivo')),
  ADD COLUMN IF NOT EXISTS produtos         text[]         NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS objetivo         text           NULL;

SELECT column_name FROM information_schema.columns
WHERE table_name = 'pessoas' AND column_name IN ('patrimonio','renda_mensal','perfil_risco','produtos','objetivo');
