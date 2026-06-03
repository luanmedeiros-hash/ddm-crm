import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';
import { toRegInterno } from '@/lib/calculos';
import type { RegistroDaily } from '@/lib/types';
import DashboardClient from './DashboardClient';
import { getConsultoresAtivos } from '@/lib/consultores-server';

export const dynamic = 'force-dynamic';

export default async function DashboardPage() {
  const supabase = await getSupabaseServer();

  const { data: { user } } = await supabase.auth.getUser();
  console.log('[dashboard] user:', user?.id, user?.email);
  if (!user) redirect('/login');

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('email, nome, role')
    .eq('id', user.id)
    .single();

  console.log('[dashboard] profile:', profile, 'error:', profileError?.message);

  const isLider = profile?.role === 'lider';
  console.log('[dashboard] isLider:', isLider);

  // Verifica se a daily de hoje foi preenchida (consultor deve preencher antes)
  if (!isLider) {
    const hoje = new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
    console.log('[dashboard] checking daily for hoje=', hoje, 'user_id=', user.id);

    const { data: dailyHoje, error: dailyError } = await supabase
      .from('registros_daily')
      .select('id')
      .eq('user_id', user.id)
      .eq('data', hoje)
      .maybeSingle();

    console.log('[dashboard] dailyHoje:', dailyHoje, 'error:', dailyError?.message);

    if (!dailyHoje) {
      console.log('[dashboard] NO DAILY -> redirecting to /daily');
      redirect('/daily');
    }
  }

  // Busca os últimos 60 dias de registros
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 60);
  const cutoffStr = cutoff.toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });

  let query = supabase
    .from('registros_daily')
    .select('*, profiles!inner(consultor_nome)')
    .gte('data', cutoffStr)
    .order('data', { ascending: false });

  if (!isLider) {
    query = query.eq('user_id', user.id);
  }

  const { data: registrosRaw, error } = await query;
  console.log('[dashboard] registros count:', (registrosRaw || []).length, 'error:', error?.message);

  if (error) {
    console.error('Erro carregando registros:', error);
  }

  const registros = ((registrosRaw as RegistroDaily[]) || []).map(toRegInterno);

  const consultores = await getConsultoresAtivos();

  return (
    <DashboardClient
      registros={registros}
      userEmail={profile?.email || user.email || ''}
      userName={profile?.nome || ''}
      isLider={isLider}
      consultores={consultores}
    />
  );
}
