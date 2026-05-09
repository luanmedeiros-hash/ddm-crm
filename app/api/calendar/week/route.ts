/**
 * GET /api/calendar/week?consultor=NOME&todos=1
 * Lê eventos da semana atual do Supabase (já sincronizados).
 * Fallback: se não há dados no DB, tenta direto da API Google.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getValidAccessToken, listEvents, getCurrentWeekRange } from '@/lib/google-calendar';
import { FEATURES } from '@/lib/features';
import type { CalendarEvent } from '@/lib/google-calendar';
import type { CalendarAttendee } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function GET(request: NextRequest) {
  if (!FEATURES.GOOGLE_CALENDAR) {
    return NextResponse.json(
      { ok: false, error: 'feature_disabled', message: 'Integração com Google Calendar está suspensa.' },
      { status: 503 }
    );
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, consultor_nome')
    .eq('id', user.id)
    .single();
  if (!profile) return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 404 });

  const isLider = profile.role === 'lider';
  const consultorParam = request.nextUrl.searchParams.get('consultor')?.trim() || '';
  const todosParam = request.nextUrl.searchParams.get('todos') === '1';

  type Target = { id: string; email: string; consultor_nome: string | null };
  let targets: Target[] = [];

  if (todosParam && isLider) {
    const { data } = await supabase
      .from('profiles')
      .select('id, email, consultor_nome')
      .eq('role', 'liderado')
      .not('consultor_nome', 'is', null);
    targets = (data as Target[]) || [];
  } else if (consultorParam) {
    if (!isLider && profile.consultor_nome !== consultorParam) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }
    const { data } = await supabase
      .from('profiles')
      .select('id, email, consultor_nome')
      .eq('consultor_nome', consultorParam)
      .maybeSingle();
    if (data) targets = [data as Target];
  } else {
    targets = [{ id: profile.id, email: profile.email, consultor_nome: profile.consultor_nome }];
  }

  const range = getCurrentWeekRange();
  const warnings: string[] = [];
  const weeks: { consultor: string; email: string; events: CalendarEvent[] }[] = [];

  for (const t of targets) {
    const label = t.consultor_nome || t.email;

    // Primeiro tenta ler do Supabase (já sincronizado)
    const { data: dbEvents } = await supabase
      .from('calendar_events')
      .select('*')
      .eq('user_id', t.id)
      .gte('start_at', range.from)
      .lte('start_at', range.to)
      .order('start_at', { ascending: true });

    if (dbEvents && dbEvents.length > 0) {
      const events: CalendarEvent[] = dbEvents.map((e: Record<string, unknown>) => ({
        id: e.id as string,
        summary: e.summary as string,
        description: e.description as string | undefined,
        start: e.start_at as string,
        end: e.end_at as string,
        location: e.location as string | undefined,
        hangoutLink: e.hangout_link as string | undefined,
        organizerEmail: e.organizer_email as string | undefined,
        status: e.status as string,
        isAllDay: e.is_all_day as boolean,
        attendees: (e.attendees as CalendarAttendee[]) || [],
      }));
      weeks.push({ consultor: label, email: t.email, events });
      continue;
    }

    // Fallback: busca direto da API Google
    const accessToken = await getValidAccessToken(supabase, t.id);
    if (!accessToken) {
      warnings.push(`${label}: sem token`);
      weeks.push({ consultor: label, email: t.email, events: [] });
      continue;
    }

    try {
      const events = await listEvents(accessToken, range.from, range.to, 'primary');
      weeks.push({ consultor: label, email: t.email, events });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'erro desconhecido';
      warnings.push(`${label}: ${msg}`);
      weeks.push({ consultor: label, email: t.email, events: [] });
    }
  }

  return NextResponse.json({
    ok: true,
    range,
    weeks,
    ...(warnings.length ? { warnings } : {}),
  });
}
