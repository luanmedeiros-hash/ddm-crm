// POST /api/winner/agendar
// Body: WinnerEventPayload
// Cria um compromisso no W1nner usando a sessão salva.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getWinnerSession, winnerCriarEvento, type WinnerEventPayload } from '@/lib/winner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  let body: WinnerEventPayload;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!body.tipo || !body.dataInicio || !body.horaInicio || !body.dataFim || !body.horaFim) {
    return NextResponse.json({ ok: false, error: 'tipo, dataInicio, horaInicio, dataFim, horaFim são obrigatórios' }, { status: 400 });
  }

  const cookie = await getWinnerSession(supabase, user.id);
  if (!cookie) {
    return NextResponse.json({
      ok: false,
      error: 'winner_not_connected',
      message: 'Conecte sua conta W1nner nas configurações antes de usar esta funcionalidade.',
    }, { status: 403 });
  }

  const result = await winnerCriarEvento(cookie, body);

  if (!result.ok) {
    // Se sessão expirou, limpa o registro para forçar novo login
    if (result.error?.includes('expirado') || result.error?.includes('CSRF')) {
      await supabase.from('winner_sessions').delete().eq('user_id', user.id);
      return NextResponse.json({
        ok: false,
        error: 'winner_session_expired',
        message: 'Sessão W1nner expirada. Reconecte sua conta nas configurações.',
      }, { status: 403 });
    }
    return NextResponse.json({ ok: false, error: result.error }, { status: 400 });
  }

  return NextResponse.json({ ok: true, eventId: result.eventId });
}
