// POST /api/calendar/create
// Body: { summary, description?, location?, startIso, endIso, attendeeEmails? }
// Cria um evento no Google Calendar do usuário autenticado.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getValidAccessToken, createCalendarEvent, type CreateEventPayload } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  let body: Partial<CreateEventPayload>;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  if (!body.summary || !body.startIso || !body.endIso) {
    return NextResponse.json({ ok: false, error: 'summary, startIso e endIso são obrigatórios' }, { status: 400 });
  }

  const accessToken = await getValidAccessToken(supabase, user.id);
  if (!accessToken) {
    return NextResponse.json({
      ok: false,
      error: 'no_token',
      message: 'Google Calendar não conectado. Faça login novamente para autorizar.',
    }, { status: 403 });
  }

  const result = await createCalendarEvent(accessToken, body as CreateEventPayload);
  if (!result) {
    return NextResponse.json({ ok: false, error: 'Erro ao criar evento no Google Calendar.' }, { status: 502 });
  }

  return NextResponse.json({ ok: true, eventId: result.id, link: result.htmlLink });
}
