-- =================================================================
-- CRM Baldada — Migration 001
-- Adiciona colunas faltantes em registros_daily e cria perfis
-- =================================================================
-- Como rodar: Supabase Dashboard → SQL Editor → cola tudo → Run
-- Idempotente: pode rodar múltiplas vezes sem problemas
-- =================================================================

-- ========== 1. EXPANDIR registros_daily ==========
-- Hoje só tem AA, PP e REC. Adicionar todas as etapas + campos novos.

ALTER TABLE public.registros_daily
  ADD COLUMN IF NOT EXISTS "CA_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "CA_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "SA_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "SA_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "EA_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "EA_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "AF_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "AF_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "CF_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "CF_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "SF_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "SF_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "EF_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "EF_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "AP_meta"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "AP_real"   numeric DEFAULT 0,
  ADD COLUMN IF NOT EXISTS ctt_quente  integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS bloqueio    text    DEFAULT 'Sem bloqueio',
  ADD COLUMN IF NOT EXISTS bloqueio_desc text  DEFAULT '',
  ADD COLUMN IF NOT EXISTS ajuda       text    DEFAULT 'Não',
  ADD COLUMN IF NOT EXISTS confianca   integer DEFAULT 3 CHECK (confianca BETWEEN 1 AND 5),
  ADD COLUMN IF NOT EXISTS avanco      text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS prioridade  text    DEFAULT '',
  ADD COLUMN IF NOT EXISTS big_points  text[]  DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS observacoes text    DEFAULT '';

-- Garantir defaults para colunas existentes que podem estar nullable
UPDATE public.registros_daily SET "AA_meta" = 0 WHERE "AA_meta" IS NULL;
UPDATE public.registros_daily SET "AA_real" = 0 WHERE "AA_real" IS NULL;
UPDATE public.registros_daily SET "PP_meta" = 0 WHERE "PP_meta" IS NULL;
UPDATE public.registros_daily SET "PP_real" = 0 WHERE "PP_real" IS NULL;
UPDATE public.registros_daily SET "REC_meta" = 0 WHERE "REC_meta" IS NULL;
UPDATE public.registros_daily SET "REC_real" = 0 WHERE "REC_real" IS NULL;

-- Índice para acelerar consultas por data + consultor
CREATE INDEX IF NOT EXISTS idx_registros_daily_data ON public.registros_daily(data);
CREATE INDEX IF NOT EXISTS idx_registros_daily_user_data ON public.registros_daily(user_id, data);

-- ========== 2. RLS — policies sem recursão ==========
ALTER TABLE public.registros_daily ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Limpar policies antigas pra evitar duplicação
DROP POLICY IF EXISTS profiles_select ON public.profiles;
DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
DROP POLICY IF EXISTS registros_select ON public.registros_daily;
DROP POLICY IF EXISTS registros_insert_own ON public.registros_daily;
DROP POLICY IF EXISTS registros_update_own ON public.registros_daily;

-- Profiles: todo logado pode ler (precisa ver consultor_nome de todo mundo)
CREATE POLICY profiles_select ON public.profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Profiles: cada um atualiza só o seu
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

-- Registros: todo logado pode ler (líder vê tudo, liderado vê todos)
-- Se quiser depois, restringir liderado a ver só os próprios:
--   USING (auth.uid() = user_id OR EXISTS(SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'lider'))
CREATE POLICY registros_select ON public.registros_daily
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Registros: insert só do próprio usuário
CREATE POLICY registros_insert_own ON public.registros_daily
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Registros: update só do próprio (com tolerância pro mesmo dia)
CREATE POLICY registros_update_own ON public.registros_daily
  FOR UPDATE USING (auth.uid() = user_id);

-- ========== 3. Trigger pra criar profile automático ==========
-- Quando um usuário é criado no Auth, cria entry em profiles com role 'liderado'
-- (você ajusta manualmente os dois líderes depois)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role)
  VALUES (NEW.id, NEW.email, 'liderado')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ========== 4. Promover líderes existentes ==========
UPDATE public.profiles
SET role = 'lider'
WHERE email IN ('igorfloriano.w1@gmail.com', 'luanmedeiros.w1@gmail.com');

-- ========== 5. Resultado ==========
SELECT
  (SELECT COUNT(*) FROM public.profiles) AS total_profiles,
  (SELECT COUNT(*) FROM public.profiles WHERE role = 'lider') AS lideres,
  (SELECT COUNT(*) FROM public.registros_daily) AS total_registros;
