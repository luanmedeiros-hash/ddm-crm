-- =================================================================
-- CRM Baldada — Migration 013: W1nner + winner_contact_id
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

-- 1. Sessões do W1nner por usuário (cookie, nunca senha)
CREATE TABLE IF NOT EXISTS public.winner_sessions (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  winner_email   text NOT NULL,
  session_cookie text NOT NULL,   -- _session cookie encriptado
  cookie_expires timestamptz NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.winner_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "winner_sessions_own" ON public.winner_sessions;
CREATE POLICY "winner_sessions_own" ON public.winner_sessions
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- 2. ID do contato no W1nner (por pessoa no CRM)
ALTER TABLE public.pessoas
  ADD COLUMN IF NOT EXISTS winner_contact_id text NULL;

-- 3. Conferência
SELECT 'winner_sessions' AS tabela, COUNT(*) FROM public.winner_sessions
UNION ALL
SELECT 'pessoas.winner_contact_id', COUNT(*) FROM public.pessoas WHERE winner_contact_id IS NOT NULL;
