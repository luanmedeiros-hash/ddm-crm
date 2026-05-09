/**
 * POST /api/calendar/sync
 * Busca os próximos 30 dias do Google Calendar do usuário autenticado
 * e faz upsert em calendar_events no Supabase.
 *
 * Body (opcional): { userId: string }  — só líder pode sincronizar por outro user.
 *
 * Resposta:
 * { ok: true, upserted: number, range: { from, to } }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getValidAccessToken, listEvents, syncEventsToSupabase, getNextDaysRange } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 404 });

  // Líder pode forçar sync de outro user via body.userId
  let targetUserId = user.id;
  try {
    const body = await request.json().catch(() => ({}));
    if (body?.userId && profile.role === 'lider') {
      targetUserId = body.userId;
    }
  } catch { /* body vazio */ }

  const accessToken = await getValidAccessToken(supabase, targetUserId);
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: 'no_token',
      message: 'Conta Google não conectada. Faça login novamente para autorizar o Calendar.',
    }, { status: 403 });
  }

  const range = getNextDaysRange(30);

  try {
    const events = await listEvents(accessToken, range.from, range.to, 'primary');
    const { upserted, error: syncError } = await syncEventsToSupabase(
      supabase, targetUserId, events, range.from, range.to
    );

    if (syncError) {
      return NextResponse.json({ ok: false, error: syncError }, { status: 500 });
    }

    return NextResponse.json({ ok: true, upserted, range });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
