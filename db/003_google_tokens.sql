-- =================================================================
-- CRM Baldada — Migration 003
-- Google Calendar (read-only): captura tokens OAuth e expoe consulta.
-- =================================================================
-- Como rodar:
--   1. Supabase Dashboard -> SQL Editor -> New query
--   2. Cole TODO este arquivo
--   3. Run
-- Idempotente: pode rodar mais de uma vez.
-- =================================================================


-- ========== 1. Tabela google_tokens ==========
-- Armazena os tokens OAuth de cada usuario para chamadas server-side
-- a Google Calendar API.

CREATE TABLE IF NOT EXISTS public.google_tokens (
  user_id        uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token   text NOT NULL,
  refresh_token  text,
  expires_at     timestamptz,            -- quando o access_token expira
  scope          text,
  updated_at     timestamptz DEFAULT now()
);

-- RLS: usuario so le os proprios tokens.
-- Lideres podem ler de todos (assim a rota /api/calendar pode buscar).
ALTER TABLE public.google_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "tokens_self_select"   ON public.google_tokens;
DROP POLICY IF EXISTS "tokens_self_upsert"   ON public.google_tokens;
DROP POLICY IF EXISTS "tokens_self_update"   ON public.google_tokens;
DROP POLICY IF EXISTS "tokens_lider_select"  ON public.google_tokens;

CREATE POLICY "tokens_self_select"
  ON public.google_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "tokens_self_upsert"
  ON public.google_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "tokens_self_update"
  ON public.google_tokens FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "tokens_lider_select"
  ON public.google_tokens FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );


-- ========== 2. Indice util ==========
CREATE INDEX IF NOT EXISTS google_tokens_updated_at_idx
  ON public.google_tokens (updated_at DESC);


-- ========== 3. Conferencia ==========
SELECT
  (SELECT COUNT(*) FROM public.profiles)       AS total_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'lider') AS lideres,
  (SELECT COUNT(*) FROM public.google_tokens)  AS tokens_armazenados;
