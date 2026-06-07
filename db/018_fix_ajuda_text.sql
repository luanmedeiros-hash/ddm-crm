-- 018_fix_ajuda_text.sql
-- Corrige a coluna registros_daily.ajuda que ficou como boolean em produção.
-- O app trata "ajuda" como texto ('Sim' / 'Não'); converte com segurança.
-- Rodar no Supabase SQL Editor.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'registros_daily'
      AND column_name = 'ajuda'
      AND data_type = 'boolean'
  ) THEN
    ALTER TABLE registros_daily ALTER COLUMN ajuda DROP DEFAULT;
    ALTER TABLE registros_daily
      ALTER COLUMN ajuda TYPE text
      USING (CASE WHEN ajuda THEN 'Sim' ELSE 'Não' END);
    ALTER TABLE registros_daily ALTER COLUMN ajuda SET DEFAULT 'Não';
  END IF;
END $$;

-- (Opcional) Garante a coluna updated_at em profiles, caso queira reativar no código.
-- ALTER TABLE profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();
