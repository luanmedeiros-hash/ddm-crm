/**
 * GET /api/calendar/consultores
 * Retorna lista de consultores que têm google_tokens salvos.
 * Só líderes conseguem ver todos; liderado vê só a si mesmo.
 */
import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();

  if (!profile) return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 404 });

  // Busca profiles que têm token
  let query = supabase
    .from('profiles')
    .select('id, email, consultor_nome')
    .not('id', 'is', null);

  // Liderado só vê a si mesmo
  if (profile.role !== 'lider') {
    query = query.eq('id', user.id);
  }

  const { data: profiles } = await query;
  if (!profiles?.length) return NextResponse.json({ ok: true, consultores: [] });

  // Filtra quem tem token
  const ids = profiles.map(p => p.id);
  const { data: tokens } = await supabase
    .from('google_tokens')
    .select('user_id')
    .in('user_id', ids);

  const tokenSet = new Set((tokens || []).map(t => t.user_id));
  const consultores = profiles
    .filter(p => tokenSet.has(p.id))
    .map(p => ({ id: p.id, email: p.email, consultor_nome: p.consultor_nome || p.email }));

  return NextResponse.json({ ok: true, consultores });
}
