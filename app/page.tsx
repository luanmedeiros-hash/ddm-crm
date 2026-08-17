import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';

// Mapa email -> nome do consultor (sempre lowercase)
const EMAIL_TO_CONSULTOR: Record<string, string> = {
  'luanmedeiros.w1@gmail.com': 'Luan',
};

const LIDERES = new Set([
  'luanmedeiros.w1@gmail.com',
]);

export default async function HomePage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const email = (user.email || '').toLowerCase();

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

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
