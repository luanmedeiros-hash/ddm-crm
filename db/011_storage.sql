-- =================================================================
-- CRM Baldada — Migration 011: Storage para anexos de clientes
-- Rodar: Supabase Dashboard → SQL Editor → Run
-- =================================================================

-- 1. Cria bucket "anexos" (privado)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'anexos',
  'anexos',
  false,
  10485760, -- 10MB por arquivo
  ARRAY['application/pdf','image/jpeg','image/png','image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet']
)
ON CONFLICT (id) DO NOTHING;

-- 2. Policies de acesso ao storage
DROP POLICY IF EXISTS "anexos_select" ON storage.objects;
DROP POLICY IF EXISTS "anexos_insert" ON storage.objects;
DROP POLICY IF EXISTS "anexos_delete" ON storage.objects;

-- Usuário autenticado pode ler objetos do seu próprio caminho (user_id/...)
CREATE POLICY "anexos_select" ON storage.objects FOR SELECT
  USING (
    bucket_id = 'anexos'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
    )
  );

CREATE POLICY "anexos_insert" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'anexos'
    AND auth.uid()::text = (string_to_array(name, '/'))[1]
  );

CREATE POLICY "anexos_delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'anexos'
    AND (
      auth.uid()::text = (string_to_array(name, '/'))[1]
      OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
    )
  );

-- 3. Tabela de metadados dos anexos
CREATE TABLE IF NOT EXISTS public.anexos (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pessoa_id   uuid NOT NULL REFERENCES public.pessoas(id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  nome        text NOT NULL,         -- nome original do arquivo
  path        text NOT NULL,         -- caminho no storage: user_id/pessoa_id/uuid.ext
  tipo_mime   text NOT NULL,
  tamanho     bigint NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_anexos_pessoa ON public.anexos(pessoa_id);

ALTER TABLE public.anexos ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anexos_meta_select" ON public.anexos;
DROP POLICY IF EXISTS "anexos_meta_insert" ON public.anexos;
DROP POLICY IF EXISTS "anexos_meta_delete" ON public.anexos;

CREATE POLICY "anexos_meta_select" ON public.anexos FOR SELECT
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

CREATE POLICY "anexos_meta_insert" ON public.anexos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "anexos_meta_delete" ON public.anexos FOR DELETE
  USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'lider')
  );

SELECT 'anexos bucket + tabela criados' AS status;
