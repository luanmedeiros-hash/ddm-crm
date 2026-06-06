-- =================================================================
-- CRM Baldada — Migration 016: histórico de alterações (audit log)
-- Registra mudanças de status/fase e avanços de etapa (reuniões).
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  changed_by  uuid NULL,            -- auth.uid() de quem fez a alteração
  campo       text NOT NULL,        -- 'status' | 'fase' | 'etapa'
  de          text NULL,
  para        text NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_pessoa ON public.audit_log(pessoa_id, created_at DESC);

ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "audit_select" ON public.audit_log;
CREATE POLICY "audit_select" ON public.audit_log FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.pessoas p
      WHERE p.id = audit_log.pessoa_id
        AND (p.user_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider'))
    )
  );

-- ── Trigger: mudanças em pessoas (status, fase) ──
CREATE OR REPLACE FUNCTION public.fn_audit_pessoas()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  IF (NEW.status IS DISTINCT FROM OLD.status) THEN
    INSERT INTO public.audit_log(pessoa_id, changed_by, campo, de, para)
    VALUES (NEW.id, auth.uid(), 'status', OLD.status, NEW.status);
  END IF;
  IF (NEW.fase IS DISTINCT FROM OLD.fase) THEN
    INSERT INTO public.audit_log(pessoa_id, changed_by, campo, de, para)
    VALUES (NEW.id, auth.uid(), 'fase', OLD.fase, NEW.fase);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_pessoas ON public.pessoas;
CREATE TRIGGER trg_audit_pessoas AFTER UPDATE ON public.pessoas
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_pessoas();

-- ── Trigger: avanço de etapa (nova reunião) ──
CREATE OR REPLACE FUNCTION public.fn_audit_reuniao()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.audit_log(pessoa_id, changed_by, campo, de, para)
  VALUES (NEW.pessoa_id, auth.uid(), 'etapa', NULL, NEW.tipo);
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_audit_reuniao ON public.reunioes;
CREATE TRIGGER trg_audit_reuniao AFTER INSERT ON public.reunioes
  FOR EACH ROW EXECUTE FUNCTION public.fn_audit_reuniao();

SELECT 'audit_log + triggers criados' AS status;
