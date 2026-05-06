import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { toRegInterno } from '@/lib/calculos';
import type { RegistroDaily } from '@/lib/types';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('email, nome, role')
    .eq('id', user.id)
    .single();

  // Busca os últimos 60 dias de registros
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toISOString().slice(0, 10);

  const { data: registrosRaw, error } = await supabase
    .from('registros_daily')
    .select('*')
    .gte('data', cutoffStr)
    .order('data', { ascending: false });

  if (error) {
    console.error('Erro carregando registros:', error);
  }

  const registros = ((registrosRaw as RegistroDaily[]) || []).map(toRegInterno);

  return (
    <DashboardClient
      registros={registros}
      userEmail={profile?.email || user.email || ''}
      userName={profile?.nome || ''}
    />
  );
}
