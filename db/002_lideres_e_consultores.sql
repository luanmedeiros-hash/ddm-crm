-- ===================================================================
-- CRM Baldada — Migration 002
-- Define os líderes (Matheus Baldini e Luan) e mapeia os 15 consultores.
-- ===================================================================

-- Líderes
UPDATE public.profiles SET role = 'lider'
WHERE lower(email) IN (
  'matheus.baldini@w1partner.com.br',
  'luanmedeiros.w1@gmail.com'
);

-- Mapeamento email -> consultor_nome
UPDATE public.profiles SET consultor_nome = 'Bacco'   WHERE lower(email) = 'brunobacco.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Danilo'  WHERE lower(email) = 'danilocastanhari.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Davi'    WHERE lower(email) = 'davigali.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Duarte'  WHERE lower(email) = 'matheusduarte.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Eric'    WHERE lower(email) = 'erichenrique.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Faria'   WHERE lower(email) = 'matheus.faria.99.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Júlio'   WHERE lower(email) = 'juliodeoliveira.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Marcelo' WHERE lower(email) = 'marcelomachado.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Mel'     WHERE lower(email) = 'melwierzba.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Pedro'   WHERE lower(email) = 'jpedrodias.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'PH'      WHERE lower(email) = 'pauloferraz.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Rafael'  WHERE lower(email) = 'rafael.garbelini.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Salgado' WHERE lower(email) = 'matheussalgado.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Shoji'   WHERE lower(email) = 'shojikato.w1@gmail.com';
UPDATE public.profiles SET consultor_nome = 'Zonaro'  WHERE lower(email) = 'mateusmzonaro.w1@gmail.com';

-- Remove Bottoni (consultor antigo)
UPDATE public.profiles SET consultor_nome = NULL WHERE lower(email) = 'bruno.bottoni.w1@gmail.com';
