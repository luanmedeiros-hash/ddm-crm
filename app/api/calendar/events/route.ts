/**
 * GET  /api/calendar/events?from=ISO&to=ISO&userId=uuid
 * Retorna eventos do Supabase (já sincronizados).
 * sem params → eventos do usuário logado, próximos 30 dias.
 *
 * PATCH /api/calendar/events
 * Vincula / desvincula um evento a um lead.
 * Body: { eventId: string, userId: string, lead_nome?: string, lead_notas?: string }
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getNextDaysRange } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 404 });

  const sp = request.nextUrl.searchParams;
  const range = getNextDaysRange(30);
  const from = sp.get('from') || range.from;
  const to = sp.get('to') || range.to;

  // Líder pode buscar por userId específico
  const requestedUserId = sp.get('userId');
  let targetUserId = user.id;
  if (requestedUserId && profile.role === 'lider') {
    targetUserId = requestedUserId;
  }

  const { data: events, error } = await supabase
    .from('calendar_events')
    .select('*')
    .eq('user_id', targetUserId)
    .gte('start_at', from)
    .lte('start_at', to)
    .order('start_at', { ascending: true });

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true, events: events || [] });
}

export async function PATCH(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const body = await request.json();
  const { eventId, userId, lead_nome, lead_notas } = body as {
    eventId: string;
    userId: string;
    lead_nome?: string | null;
    lead_notas?: string | null;
  };

  if (!eventId || !userId) {
    return NextResponse.json({ ok: false, error: 'eventId e userId são obrigatórios' }, { status: 400 });
  }

  // Só o próprio consultor ou líder pode vincular
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  const isOwner = user.id === userId;
  const isLider = profile?.role === 'lider';
  if (!isOwner && !isLider) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  const { error } = await supabase
    .from('calendar_events')
    .update({
      lead_nome: lead_nome ?? null,
      lead_notas: lead_notas ?? null,
    })
    .eq('id', eventId)
    .eq('user_id', userId);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
