import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';

// Mapa email → nome do consultor (sempre lowercase)
const EMAIL_TO_CONSULTOR: Record<string, string> = {
  'brunobacco.w1@gmail.com':         'Bacco',
  'bruno.bottoni.w1@gmail.com':      'Bottoni',
  'danilocastanhari.w1@gmail.com':   'Danilo',
  'davigali.w1@gmail.com':           'Davi',
  'matheusduarte.w1@gmail.com':      'Duarte',
  'erichenrique.w1@gmail.com':       'Eric',
  'matheus.faria.99.w1@gmail.com':   'Faria',
  'juliodeoliveira.w1@gmail.com':    'Júlio',
  'melwierzba.w1@gmail.com':         'Mel',
  'jpedrodias.w1@gmail.com':         'Pedro',
  'pauloferraz.w1@gmail.com':        'PH',
  'rafael.garbelini.w1@gmail.com':   'Rafael',
  'matheussalgado.w1@gmail.com':     'Salgado',
  'shojikato.w1@gmail.com':          'Shoji',
};

const LIDERES = new Set([
  'matheus.baldini@w1partner.com.br',
  'luanmedeiros.w1@gmail.com',
]);

export default async function HomePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const email = (user.email || '').toLowerCase();

  // Verifica se já existe profile
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Se não tem profile, cria automaticamente (primeiro login Google)
  if (!profile) {
    const isLider = LIDERES.has(email);
    const consultorNome = EMAIL_TO_CONSULTOR[email] || null;
    const fullName =
      (user.user_metadata?.full_name as string | undefined) ||
      (user.user_metadata?.name as string | undefined) ||
      consultorNome ||
      email.split('@')[0];

    await supabase.from('profiles').upsert({
      id: user.id,
      email,
      nome: fullName,
      role: isLider ? 'lider' : 'liderado',
      consultor_nome: consultorNome,
    }, { onConflict: 'id' });

    if (isLider) redirect('/dashboard');
    redirect('/daily');
  }

  if (profile.role === 'lider') redirect('/dashboard');
  redirect('/daily');
}
