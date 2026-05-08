-- =================================================================
-- CRM Baldada — Migration 002
-- Atualiza líderes e mapeia consultores aos seus e-mails reais.
-- =================================================================
-- Como rodar:
--   1. Supabase Dashboard → SQL Editor → New query
--   2. Cole TODO este arquivo
--   3. Run
-- Idempotente: pode rodar mais de uma vez sem efeito colateral.
-- =================================================================


-- ========== 1. LÍDERES ==========
-- Matheus Baldini substitui Igor Floriano como líder.
-- Os dois e-mails abaixo passam a ser 'lider'. Todo o resto vira 'liderado'.

UPDATE public.profiles
SET role = 'lider'
WHERE lower(email) IN (
  'matheus.baldini@w1partner.com.br',
  'luanmedeiros.w1@gmail.com'
);

-- Garante que o Igor (líder antigo) volta a ser liderado
-- ou simplesmente não fica como líder caso exista no banco.
UPDATE public.profiles
SET role = 'liderado'
WHERE lower(email) = 'igorfloriano.w1@gmail.com';


-- ========== 2. MAPA email -> consultor_nome ==========
-- Cada UPDATE só altera quem já existe na tabela profiles.
-- Se o usuário ainda não existe (não logou nenhuma vez via Google),
-- nada acontece — e quando ele logar, o app cria o profile já correto
-- pelo mapa em app/page.tsx (EMAIL_TO_CONSULTOR).

UPDATE public.profiles SET consultor_nome = 'Bacco'    WHERE lower(email) = 'brunobacco.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Bottoni'  WHERE lower(email) = 'bruno.bottoni.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Danilo'   WHERE lower(email) = 'danilocastanhari.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Davi'     WHERE lower(email) = 'davigali.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Duarte'   WHERE lower(email) = 'matheusduarte.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Eric'     WHERE lower(email) = 'erichenrique.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Faria'    WHERE lower(email) = 'matheus.faria.99.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Júlio'    WHERE lower(email) = 'juliodeoliveira.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Mel'      WHERE lower(email) = 'melwierzba.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Pedro'    WHERE lower(email) = 'jpedrodias.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'PH'       WHERE lower(email) = 'pauloferraz.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Rafael'   WHERE lower(email) = 'rafael.garbelini.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Salgado'  WHERE lower(email) = 'matheussalgado.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Shoji'    WHERE lower(email) = 'shojikato.w1@gmail.com';


-- ========== 3. (OPCIONAL) Tratar registros antigos do "Bruno" ==========
-- O time mudou: 'Bruno' deixou de existir e virou 'Bacco' + 'Bottoni'.
-- Se a conta antiga 'bruno.w1@gmail.com' (ou similar) tinha registros,
-- escolha UMA das opções abaixo descomentando:

-- OPÇÃO A — apagar registros antigos do Bruno (se eram dados de teste):
-- DELETE FROM public.registros_daily
-- WHERE user_id IN (SELECT id FROM public.profiles WHERE consultor_nome = 'Bruno');
-- DELETE FROM public.profiles WHERE consultor_nome = 'Bruno';

-- OPÇÃO B — migrar registros antigos do Bruno para Bacco:
-- UPDATE public.profiles SET consultor_nome = 'Bacco' WHERE consultor_nome = 'Bruno';

-- OPÇÃO C — não fazer nada agora (deixar inativo, sem aparecer no dashboard).


-- ========== 4. CONFERÊNCIA ==========
-- Mostra o resultado para você validar antes de fechar.

SELECT
  email,
  nome,
  role,
  consultor_nome,
  created_at
FROM public.profiles
ORDER BY
  CASE WHEN role = 'lider' THEN 0 ELSE 1 END,
  consultor_nome NULLS LAST,
  email;
