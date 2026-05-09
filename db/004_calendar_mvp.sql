-- =================================================================
-- CRM Baldada — Migration 004
-- Google Calendar MVP: eventos sincronizados + vinculação a leads
-- =================================================================
-- Como rodar:
--   Supabase Dashboard → SQL Editor → New query → Cole tudo → Run
-- Idempotente: pode rodar múltiplas vezes.
-- =================================================================


-- ========== 1. calendar_events ==========
-- Espelho local dos eventos do Google Calendar de cada consultor.
-- Sincronização manual (botão) via /api/calendar/sync.

CREATE TABLE IF NOT EXISTS public.calendar_events (
  id              text        NOT NULL,          -- Google event id
  user_id         uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  google_id       text        NOT NULL,          -- mesmo que id (redundante p/ clareza)
  summary         text        NOT NULL DEFAULT '',
  description     text,
  start_at        timestamptz NOT NULL,
  end_at          timestamptz NOT NULL,
  location        text,
  hangout_link    text,
  organizer_email text,
  attendees       jsonb       NOT NULL DEFAULT '[]',
  status          text        NOT NULL DEFAULT 'confirmed',
  is_all_day      boolean     NOT NULL DEFAULT false,
  synced_at       timestamptz NOT NULL DEFAULT now(),
  -- Metadados de vinculação
  lead_id         uuid,                          -- FK → leads (quando existir)
  lead_nome       text,                          -- nome livre até ter tabela leads
  lead_notas      text,                          -- anotações do consultor sobre a reunião
  -- Botões futuros (flags de estado, sem implementação ainda)
  briefing_gerado     boolean NOT NULL DEFAULT false,
  transcricao_url     text,
  relatorio_gerado    boolean NOT NULL DEFAULT false,
  followup_gerado     boolean NOT NULL DEFAULT false,

  PRIMARY KEY (id, user_id)
);

-- Índices
CREATE INDEX IF NOT EXISTS cal_events_user_start
  ON public.calendar_events (user_id, start_at DESC);

CREATE INDEX IF NOT EXISTS cal_events_start_at
  ON public.calendar_events (start_at DESC);

CREATE INDEX IF NOT EXISTS cal_events_lead_id
  ON public.calendar_events (lead_id)
  WHERE lead_id IS NOT NULL;


-- ========== 2. RLS calendar_events ==========
ALTER TABLE public.calendar_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cal_self_select"   ON public.calendar_events;
DROP POLICY IF EXISTS "cal_self_insert"   ON public.calendar_events;
DROP POLICY IF EXISTS "cal_self_update"   ON public.calendar_events;
DROP POLICY IF EXISTS "cal_self_delete"   ON public.calendar_events;
DROP POLICY IF EXISTS "cal_lider_select"  ON public.calendar_events;

-- Consultor vê só os próprios
CREATE POLICY "cal_self_select"
  ON public.calendar_events FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "cal_self_insert"
  ON public.calendar_events FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "cal_self_update"
  ON public.calendar_events FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "cal_self_delete"
  ON public.calendar_events FOR DELETE
  USING (auth.uid() = user_id);

-- Líder vê todos
CREATE POLICY "cal_lider_select"
  ON public.calendar_events FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );

-- Líder pode atualizar lead_nome / lead_notas de qualquer evento
CREATE POLICY "cal_lider_update"
  ON public.calendar_events FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );


-- ========== 3. sync_log (opcional, auditoria) ==========
CREATE TABLE IF NOT EXISTS public.calendar_sync_log (
  id           bigserial   PRIMARY KEY,
  user_id      uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  synced_at    timestamptz NOT NULL DEFAULT now(),
  events_upserted integer  NOT NULL DEFAULT 0,
  range_from   timestamptz,
  range_to     timestamptz,
  error        text
);

ALTER TABLE public.calendar_sync_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "synclog_self" ON public.calendar_sync_log;
DROP POLICY IF EXISTS "synclog_lider" ON public.calendar_sync_log;

CREATE POLICY "synclog_self"
  ON public.calendar_sync_log FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "synclog_lider"
  ON public.calendar_sync_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = auth.uid() AND role = 'lider'
    )
  );


-- ========== 4. Conferência ==========
SELECT
  (SELECT COUNT(*) FROM public.calendar_events)     AS eventos_sincronizados,
  (SELECT COUNT(*) FROM public.calendar_sync_log)   AS sincronizacoes,
  (SELECT COUNT(*) FROM public.google_tokens)       AS tokens_armazenados;
