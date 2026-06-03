-- =================================================================
-- CRM Baldada — Migration 000 (BOOTSTRAP)
-- Cria as tabelas base que no DDM já existiam de versões anteriores.
-- Esta migration só é necessária em projetos Supabase novos.
-- =================================================================
-- Como rodar: Supabase Dashboard → SQL Editor → cola tudo → Run
-- Idempotente: pode rodar múltiplas vezes sem problemas
-- =================================================================

-- ========== 1. Tabela profiles ==========
CREATE TABLE IF NOT EXISTS public.profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email           text UNIQUE NOT NULL,
  nome            text,
  role            text NOT NULL DEFAULT 'liderado' CHECK (role IN ('lider', 'liderado')),
  consultor_nome  text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_consultor ON public.profiles(consultor_nome);

-- ========== 2. Tabela registros_daily ==========
-- Versão mínima — a migration 001 adiciona as colunas restantes
CREATE TABLE IF NOT EXISTS public.registros_daily (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  data        date NOT NULL,
  "AA_meta"   numeric DEFAULT 0,
  "AA_real"   numeric DEFAULT 0,
  "PP_meta"   numeric DEFAULT 0,
  "PP_real"   numeric DEFAULT 0,
  "REC_meta"  numeric DEFAULT 0,
  "REC_real"  numeric DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, data)
);

-- ========== 3. Conferência ==========
SELECT
  'profiles' AS tabela,
  (SELECT COUNT(*) FROM public.profiles) AS rows
UNION ALL
SELECT
  'registros_daily' AS tabela,
  (SELECT COUNT(*) FROM public.registros_daily) AS rows;
