import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getValidAccessToken, listEvents, getCurrentWeekRange } from '@/lib/google-calendar';
import { FEATURES } from '@/lib/features';
import type { CalendarEvent } from '@/lib/google-calendar';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

/**
 * GET /api/calendar/week?consultor=NOME
 * - sem param: retorna agenda do próprio usuário logado
 * - com param "consultor=Bottoni" (apenas líder): tenta buscar agenda
 *   do consultor com aquele nome.
 *
 * Resposta:
 * {
 *   ok: true,
 *   range: { from, to },
 *   weeks: [
 *     { consultor: "Bottoni", email, events: [...] }
 *   ],
 *   warnings?: string[]
 * }
 */
export async function GET(request: NextRequest) {
  if (!FEATURES.GOOGLE_CALENDAR) {
    return NextResponse.json(
      { ok: false, error: 'feature_disabled', message: 'Integração com Google Calendar está suspensa.' },
      { status: 503 }
    );
  }

  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, role, consultor_nome')
    .eq('id', user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ ok: false, error: 'profile_not_found' }, { status: 404 });
  }

  const isLider = profile.role === 'lider';
  const consultorParam = request.nextUrl.searchParams.get('consultor')?.trim() || '';
  const todosParam = request.nextUrl.searchParams.get('todos') === '1';

  // Decide qual conjunto de profiles buscar
  type Target = { id: string; email: string; consultor_nome: string | null };
  let targets: Target[] = [];

  if (todosParam && isLider) {
    // Líder pedindo agenda de TODOS os consultores
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
    // Sem params: retorna do próprio usuário (líder vendo a própria agenda também passa por aqui)
    targets = [{
      id: profile.id,
      email: profile.email,
      consultor_nome: profile.consultor_nome,
    }];
  }

  const range = getCurrentWeekRange();
  const warnings: string[] = [];
  const weeks: { consultor: string; email: string; events: CalendarEvent[] }[] = [];

  for (const t of targets) {
    const accessToken = await getValidAccessToken(supabase, t.id);
    const label = t.consultor_nome || t.email;

    if (!accessToken) {
      warnings.push(`${label}: sem token (precisa logar com Google)`);
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
