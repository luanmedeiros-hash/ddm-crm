/**
 * Helpers server-side para Google Calendar API (read-only).
 * NÃO USAR no client — depende de GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type { CalendarEventDB, CalendarAttendee } from './types';

export interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: string;
  end: string;
  location?: string;
  hangoutLink?: string;
  attendees: CalendarAttendee[];
  organizerEmail?: string;
  status: string;
  isAllDay: boolean;
}

interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
}

// ─── Token management ─────────────────────────────────────────────────────────

async function refreshAccessToken(
  supabase: SupabaseClient,
  row: TokenRow
): Promise<string | null> {
  if (!row.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.warn('[google-calendar] GOOGLE_CLIENT_ID/SECRET não configurados — não é possível renovar token');
    return null;
  }

  const params = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: row.refresh_token,
    grant_type: 'refresh_token',
  });

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  if (!res.ok) {
    console.error('[google-calendar] refresh falhou:', res.status, await res.text());
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  const expiresAt = new Date(Date.now() + (json.expires_in - 60) * 1000).toISOString();

  await supabase
    .from('google_tokens')
    .update({ access_token: json.access_token, expires_at: expiresAt, updated_at: new Date().toISOString() })
    .eq('user_id', row.user_id);

  return json.access_token;
}

export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('user_id, access_token, refresh_token, expires_at, scope')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) {
    console.warn('[google-calendar] token não encontrado para userId:', userId);
    return null;
  }
  const row = data as TokenRow;

  // Token ainda válido por mais de 2 minutos → retorna direto sem tentar refresh
  if (row.expires_at) {
    const expiresMs = new Date(row.expires_at).getTime();
    if (expiresMs - Date.now() > 120_000) {
      return row.access_token;
    }
  } else {
    // Sem expires_at: retorna o token e tenta renovar em background
    return row.access_token;
  }

  // Token próximo de expirar ou expirado → tenta refresh
  const refreshed = await refreshAccessToken(supabase, row);
  // Se refresh falhou mas token ainda não expirou de fato, usa o atual
  if (!refreshed && row.expires_at) {
    const expiresMs = new Date(row.expires_at).getTime();
    if (expiresMs > Date.now()) {
      console.warn('[google-calendar] refresh falhou mas token ainda válido, usando access_token atual');
      return row.access_token;
    }
  }
  return refreshed;
}

// ─── Google Calendar API ──────────────────────────────────────────────────────

interface GoogleEventRaw {
  id: string;
  summary?: string;
  description?: string;
  status?: string;
  location?: string;
  hangoutLink?: string;
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  organizer?: { email?: string };
  attendees?: {
    email?: string;
    displayName?: string;
    responseStatus?: string;
    self?: boolean;
    organizer?: boolean;
  }[];
}

function toCalendarEvent(ev: GoogleEventRaw): CalendarEvent {
  const isAllDay = !ev.start?.dateTime;
  return {
    id: ev.id,
    summary: ev.summary || '(sem título)',
    description: ev.description,
    start: ev.start?.dateTime || ev.start?.date || '',
    end: ev.end?.dateTime || ev.end?.date || '',
    location: ev.location,
    hangoutLink: ev.hangoutLink,
    organizerEmail: ev.organizer?.email,
    status: ev.status || 'confirmed',
    isAllDay,
    attendees: (ev.attendees || []).map(a => ({
      email: a.email || '',
      displayName: a.displayName,
      responseStatus: a.responseStatus as CalendarAttendee['responseStatus'],
      self: a.self,
      organizer: a.organizer,
    })),
  };
}

export async function listEvents(
  accessToken: string,
  fromIso: string,
  toIso: string,
  calendarId = 'primary'
): Promise<CalendarEvent[]> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set('timeMin', fromIso);
  url.searchParams.set('timeMax', toIso);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '100');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as { items?: GoogleEventRaw[] };
  return (json.items || [])
    .filter(ev => ev.status !== 'cancelled')
    .map(toCalendarEvent);
}

// ─── Sync: upsert eventos no Supabase ─────────────────────────────────────────

/** Registra no sync_log — fire-and-forget, não bloqueia o fluxo principal */
async function logSync(
  supabase: SupabaseClient,
  userId: string,
  upserted: number,
  rangeFrom: string,
  rangeTo: string,
  errorMsg?: string
) {
  try {
    await supabase.from('calendar_sync_log').insert({
      user_id: userId,
      events_upserted: upserted,
      range_from: rangeFrom,
      range_to: rangeTo,
      ...(errorMsg ? { error: errorMsg } : {}),
    });
  } catch (e) {
    // Log silencioso — não quebra o fluxo de sync
    console.warn('[google-calendar] sync_log insert falhou (RLS?):', e);
  }
}

export async function syncEventsToSupabase(
  supabase: SupabaseClient,
  userId: string,
  events: CalendarEvent[],
  rangeFrom: string,
  rangeTo: string
): Promise<{ upserted: number; error?: string }> {
  if (events.length === 0) {
    void logSync(supabase, userId, 0, rangeFrom, rangeTo);
    return { upserted: 0 };
  }

  const rows: Omit<CalendarEventDB, 'briefing_gerado' | 'relatorio_gerado' | 'followup_gerado'>[] = events.map(ev => ({
    id: ev.id,
    user_id: userId,
    google_id: ev.id,
    summary: ev.summary,
    description: ev.description ?? null,
    start_at: ev.start,
    end_at: ev.end,
    location: ev.location ?? null,
    hangout_link: ev.hangoutLink ?? null,
    organizer_email: ev.organizerEmail ?? null,
    attendees: ev.attendees as unknown as CalendarAttendee[],
    status: ev.status,
    is_all_day: ev.isAllDay,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from('calendar_events')
    .upsert(rows, { onConflict: 'id,user_id', ignoreDuplicates: false });

  if (error) {
    console.error('[syncEvents] erro no upsert:', error.message);
    void logSync(supabase, userId, 0, rangeFrom, rangeTo, error.message);
    return { upserted: 0, error: error.message };
  }

  // Log em background — não bloqueia o retorno
  void logSync(supabase, userId, events.length, rangeFrom, rangeTo);
  return { upserted: events.length };
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

export function getNextDaysRange(days = 30, timezone = 'America/Sao_Paulo') {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: timezone });
  const local = new Date(localStr);
  local.setHours(0, 0, 0, 0);
  const to = new Date(local);
  to.setDate(local.getDate() + days);
  to.setHours(23, 59, 59, 999);
  return { from: local.toISOString(), to: to.toISOString() };
}

export function getCurrentWeekRange(timezone = 'America/Sao_Paulo') {
  const now = new Date();
  const localStr = now.toLocaleString('en-US', { timeZone: timezone });
  const local = new Date(localStr);
  const day = local.getDay();
  const daysFromMonday = day === 0 ? 6 : day - 1;
  const monday = new Date(local);
  monday.setDate(local.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);
  return { from: monday.toISOString(), to: sunday.toISOString() };
}
