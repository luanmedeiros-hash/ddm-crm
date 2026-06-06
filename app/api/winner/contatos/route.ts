// GET /api/winner/contatos
// Retorna lista de contatos do W1nner para mapeamento.

import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getWinnerSession, winnerListarContatos } from '@/lib/winner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const cookie = await getWinnerSession(supabase, user.id);
  if (!cookie) {
    return NextResponse.json({ ok: false, error: 'winner_not_connected' }, { status: 403 });
  }

  const contatos = await winnerListarContatos(cookie);
  if (contatos === null) {
    // Sessão expirada — limpa e pede reconexão
    await supabase.from('winner_sessions').delete().eq('user_id', user.id);
    return NextResponse.json({ ok: false, error: 'winner_not_connected' }, { status: 403 });
  }
  return NextResponse.json({ ok: true, contatos });
}
