// lib/winner.ts
// Helpers server-side para integração com o W1nner (w1nner.w1consultoria.com.br)
// NUNCA expor no client-side.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const BASE = 'https://w1nner.w1consultoria.com.br/painel-consultor';

// Mapeamento CRM → W1nner event_type
export const TIPO_WINNER: Record<string, string> = {
  analise:        'analysis',
  c1:             'consulting_c1',
  c2:             'consulting_c2',
  c3:             'consulting_c3',
  c4:             'consulting_c4',
  acompanhamento: 'service',
};

// ─── Sessão ───────────────────────────────────────────────────

/**
 * Faz login no W1nner e retorna o cookie de sessão.
 * Nunca armazena a senha — só o cookie.
 */
export async function winnerLogin(email: string, password: string): Promise<string | null> {
  // 1. GET na página de login para obter o CSRF token
  const loginPage = await fetch(`${BASE}/entrar`, {
    headers: { 'User-Agent': 'CRM-Baldada/1.0' },
  });
  if (!loginPage.ok) return null;

  const html = await loginPage.text();
  const setCookie = loginPage.headers.get('set-cookie') || '';
  const sessionCookieMatch = setCookie.match(/_session=[^;]+/);
  const initialCookie = sessionCookieMatch ? sessionCookieMatch[0] : '';

  // Extrai CSRF token
  const csrfMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (!csrfMatch) return null;
  const csrf = csrfMatch[1];

  // 2. POST com credenciais
  const loginRes = await fetch(`${BASE}/entrar`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'CRM-Baldada/1.0',
      'Cookie': initialCookie,
    },
    body: new URLSearchParams({
      'utf8': '✓',
      'authenticity_token': csrf,
      'consultant_person[email]': email,
      'consultant_person[password]': password,
      'commit': 'Logar',
    }),
  });

  // Sucesso = redirect para /agenda ou /dashboard
  if (loginRes.status !== 302 && loginRes.status !== 200) return null;

  const cookies = loginRes.headers.get('set-cookie') || '';
  const match = cookies.match(/_session=[^;]+/);
  return match ? match[0] : null;
}

/**
 * Busca o cookie de sessão salvo no banco para o usuário.
 */
export async function getWinnerSession(supabase: SupabaseClient, userId: string): Promise<string | null> {
  const { data } = await supabase
    .from('winner_sessions')
    .select('session_cookie, cookie_expires')
    .eq('user_id', userId)
    .single();
  if (!data) return null;
  // Verifica se expirou (margem de 5 min)
  if (data.cookie_expires) {
    const expires = new Date(data.cookie_expires).getTime();
    if (Date.now() > expires - 5 * 60_000) return null;
  }
  return data.session_cookie;
}

/**
 * Salva o cookie de sessão no banco.
 */
export async function saveWinnerSession(
  supabase: SupabaseClient,
  userId: string,
  email: string,
  cookie: string,
): Promise<void> {
  // Sessões Rails por padrão expiram em 2 semanas
  const expires = new Date(Date.now() + 13 * 24 * 60 * 60 * 1000).toISOString();
  await supabase.from('winner_sessions').upsert({
    user_id: userId,
    winner_email: email,
    session_cookie: cookie,
    cookie_expires: expires,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

// ─── Operações ───────────────────────────────────────────────

export interface WinnerEventPayload {
  tipo: string;                  // chave do CRM (analise, c1, c2...)
  dataInicio: string;            // ISO ou dd/mm/aaaa
  horaInicio: string;            // HH:mm
  dataFim: string;
  horaFim: string;
  winnerContactId?: string;      // ID numérico do contato no W1nner
  winnerConsultantId?: string;   // ID do consultor no W1nner (opcional)
  endereco?: string;
  descricao?: string;
}

function fmtDataWinner(iso: string): string {
  // Se já está no formato dd/mm/aaaa retorna igual
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(iso)) return iso;
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/**
 * Cria um compromisso no W1nner usando o cookie de sessão.
 */
export async function winnerCriarEvento(
  sessionCookie: string,
  payload: WinnerEventPayload,
): Promise<{ ok: boolean; error?: string; eventId?: string }> {
  // 1. GET na página de novo evento para obter CSRF
  const newPage = await fetch(`${BASE}/agenda/new`, {
    headers: {
      'User-Agent': 'CRM-Baldada/1.0',
      'Cookie': sessionCookie,
    },
  });
  if (!newPage.ok) return { ok: false, error: `Erro ao carregar formulário: ${newPage.status}` };

  const html = await newPage.text();
  const csrfMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (!csrfMatch) return { ok: false, error: 'CSRF token não encontrado — sessão pode ter expirado' };
  const csrf = csrfMatch[1];

  // 2. Monta o body
  const eventType = TIPO_WINNER[payload.tipo] || payload.tipo;
  const body = new URLSearchParams({
    'utf8': '✓',
    'authenticity_token': csrf,
    'calendar_event[event_type]': eventType,
    'calendar_event[start_at][date]': fmtDataWinner(payload.dataInicio),
    'calendar_event[start_at][time]': payload.horaInicio,
    'calendar_event[end_at][date]': fmtDataWinner(payload.dataFim),
    'calendar_event[end_at][time]': payload.horaFim,
    'calendar_event[event_address]': payload.endereco || '',
    'calendar_event[description]': payload.descricao || 'Agendado via CRM Baldada',
    'commit': 'Salvar',
  });

  if (payload.winnerContactId) {
    body.append('calendar_event[contact_id]', payload.winnerContactId);
  }
  if (payload.winnerConsultantId) {
    body.append('calendar_event[person_id]', payload.winnerConsultantId);
  }

  // 3. POST
  const res = await fetch(`${BASE}/agenda`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'CRM-Baldada/1.0',
      'Cookie': sessionCookie,
      'Referer': `${BASE}/agenda/new`,
    },
    body,
  });

  // Rails redireciona para /agenda/{id} em caso de sucesso
  if (res.status === 302) {
    const location = res.headers.get('location') || '';
    const idMatch = location.match(/agenda\/(\d+)/);
    return { ok: true, eventId: idMatch?.[1] };
  }

  if (res.status === 200) {
    // Pode ser erro de validação — verifica o HTML
    const respHtml = await res.text();
    const hasError = respHtml.includes('alert-danger') || respHtml.includes('error');
    if (hasError) {
      const errorMatch = respHtml.match(/class="alert[^"]*alert-danger[^"]*"[^>]*>([\s\S]{0,300})/);
      const msg = errorMatch ? errorMatch[1].replace(/<[^>]+>/g, ' ').trim() : 'Erro de validação no W1nner';
      return { ok: false, error: msg };
    }
    return { ok: true }; // assumir ok se não encontrou erro
  }

  return { ok: false, error: `Status inesperado: ${res.status}` };
}

/**
 * Busca a lista de contatos do W1nner para o usuário logado.
 * Retorna id + nome para mapeamento no CRM.
 */
export async function winnerListarContatos(sessionCookie: string): Promise<{ id: string; nome: string }[]> {
  const page = await fetch(`${BASE}/agenda/new`, {
    headers: { 'User-Agent': 'CRM-Baldada/1.0', 'Cookie': sessionCookie },
  });
  if (!page.ok) return [];
  const html = await page.text();

  // Extrai options do select contact_id
  const matches = [...html.matchAll(/<option value="(\d+)">([^<]+)<\/option>/g)];
  return matches.map(m => ({ id: m[1], nome: m[2].trim() }));
}
