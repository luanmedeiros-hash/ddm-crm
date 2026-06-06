-- =================================================================
-- CRM Baldada — Migration 015: unicidade do contato W1nner
-- Garante que um mesmo contato do W1nner não seja cadastrado 2x.
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

-- Índice único parcial: cada winner_contact_id aparece no máximo 1x
-- (ignora linhas com winner_contact_id NULL — dados antigos)
CREATE UNIQUE INDEX IF NOT EXISTS uniq_pessoas_winner_contact
  ON public.pessoas (winner_contact_id)
  WHERE winner_contact_id IS NOT NULL;

SELECT 'índice único winner_contact_id criado' AS status;
