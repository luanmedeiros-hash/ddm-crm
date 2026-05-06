import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import type { RegistroDaily } from '@/lib/types';
import DailyForm from './DailyForm';

export const dynamic = 'force-dynamic';

export default async function DailyPage() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, nome, consultor_nome, role')
    .eq('id', user.id)
    .single();

  // Busca registro de hoje (se existir, vamos editar)
  const hoje = new Date().toISOString().slice(0, 10);
  const { data: registroHoje } = await supabase
    .from('registros_daily')
    .select('*')
    .eq('user_id', user.id)
    .eq('data', hoje)
    .maybeSingle();

  return (
    <DailyForm
      userId={user.id}
      consultorNome={profile?.consultor_nome || profile?.nome || profile?.email?.split('@')[0] || 'Consultor'}
      registroExistente={registroHoje as RegistroDaily | null}
      isLider={profile?.role === 'lider'}
    />
  );
}
