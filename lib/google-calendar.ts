/**
 * Helper server-side para Google Calendar API (read-only).
 *
 * Responsabilidades:
 * 1. Carregar tokens de google_tokens
 * 2. Renovar access_token via refresh_token quando expirado
 * 3. Listar eventos da semana atual de um usuário
 *
 * NÃO USAR no client — depende de variáveis de ambiente sensíveis
 * (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET).
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export interface CalendarEvent {
  id: string;
  summary: string;            // título
  description?: string;
  start: string;              // ISO 8601
  end: string;
  location?: string;
  hangoutLink?: string;       // Google Meet
  attendees: {
    email: string;
    displayName?: string;
    responseStatus?: string;  // accepted | declined | tentative | needsAction
    self?: boolean;
    organizer?: boolean;
  }[];
  organizerEmail?: string;
  status: string;             // confirmed | tentative | cancelled
}

interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string | null;
  expires_at: string | null;
  scope: string | null;
}

/**
 * Renova o access_token Google usando o refresh_token salvo.
 * Atualiza a linha em google_tokens.
 */
async function refreshAccessToken(
  supabase: SupabaseClient,
  row: TokenRow
): Promise<string | null> {
  if (!row.refresh_token) return null;

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    console.error('[google-calendar] GOOGLE_CLIENT_ID/SECRET não configurados');
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
    const errText = await res.text();
    console.error('[google-calendar] refresh falhou:', res.status, errText);
    return null;
  }

  const json = (await res.json()) as { access_token: string; expires_in: number };
  const newAccessToken = json.access_token;
  const expiresAt = new Date(Date.now() + (json.expires_in - 60) * 1000).toISOString();

  await supabase
    .from('google_tokens')
    .update({
      access_token: newAccessToken,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq('user_id', row.user_id);

  return newAccessToken;
}

/**
 * Retorna um access_token válido para o user — renovando se expirou.
 * Retorna null se não houver token salvo ou se o refresh falhar.
 */
export async function getValidAccessToken(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('google_tokens')
    .select('user_id, access_token, refresh_token, expires_at, scope')
    .eq('user_id', userId)
    .maybeSingle();

  if (error || !data) return null;
  const row = data as TokenRow;

  // Token ainda válido (com margem de 30s)
  if (row.expires_at) {
    const expiresMs = new Date(row.expires_at).getTime();
    if (expiresMs - Date.now() > 30 * 1000) {
      return row.access_token;
    }
  }

  // Expirado → tenta refresh
  return refreshAccessToken(supabase, row);
}

/**
 * Lista eventos do calendário primário do usuário entre as datas dadas.
 */
export async function listEvents(
  accessToken: string,
  fromIso: string,
  toIso: string,
  calendarId: string = 'primary'
): Promise<CalendarEvent[]> {
  const url = new URL(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events`
  );
  url.searchParams.set('timeMin', fromIso);
  url.searchParams.set('timeMax', toIso);
  url.searchParams.set('singleEvents', 'true');
  url.searchParams.set('orderBy', 'startTime');
  url.searchParams.set('maxResults', '50');

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
    cache: 'no-store',
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`Google Calendar API ${res.status}: ${txt}`);
  }

  const json = (await res.json()) as { items?: GoogleEventRaw[] };
  const items = json.items || [];

  return items
    .filter(ev => ev.status !== 'cancelled')
    .map(toCalendarEvent);
}

/* ---------- helpers de tipo (raw → tipado) ---------- */

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
    attendees: (ev.attendees || []).map(a => ({
      email: a.email || '',
      displayName: a.displayName,
      responseStatus: a.responseStatus,
      self: a.self,
      organizer: a.organizer,
    })),
  };
}

/**
 * Calcula o intervalo da semana atual (segunda 00:00 → domingo 23:59:59)
 * no fuso horário do servidor (Vercel = UTC, mas timezone consciente).
 */
export function getCurrentWeekRange(timezone = 'America/Sao_Paulo') {
  const now = new Date();
  // Convertemos para o TZ desejado para encontrar segunda-feira corretamente
  const localStr = now.toLocaleString('en-US', { timeZone: timezone });
  const local = new Date(localStr);

  const day = local.getDay(); // 0=dom, 1=seg ... 6=sab
  // Segunda = 1. Quantos dias retroceder para chegar na segunda?
  const daysFromMonday = day === 0 ? 6 : day - 1;

  const monday = new Date(local);
  monday.setDate(local.getDate() - daysFromMonday);
  monday.setHours(0, 0, 0, 0);

  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  sunday.setHours(23, 59, 59, 999);

  return {
    from: monday.toISOString(),
    to: sunday.toISOString(),
  };
}
