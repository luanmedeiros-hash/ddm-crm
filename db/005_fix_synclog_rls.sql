-- Migration 005: corrige RLS do calendar_sync_log (faltavam políticas INSERT)
-- e adiciona INSERT policy para o google_tokens (para o callback salvar)
-- Idempotente.

-- ── calendar_sync_log: INSERT (servidor pode inserir para o próprio user) ──
DROP POLICY IF EXISTS "synclog_self_insert" ON public.calendar_sync_log;
CREATE POLICY "synclog_self_insert"
  ON public.calendar_sync_log FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ── google_tokens: confirma que as políticas existem ──
-- (já criadas na 003, mas garantindo)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'google_tokens' AND cmd = 'INSERT'
  ) THEN
    CREATE POLICY "tokens_self_insert"
      ON public.google_tokens FOR INSERT
      WITH CHECK (auth.uid() = user_id);
  END IF;
END$$;

-- Verificação
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE tablename IN ('calendar_sync_log', 'calendar_events', 'google_tokens')
ORDER BY tablename, cmd;
