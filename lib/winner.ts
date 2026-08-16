// lib/winner.ts
// Helpers server-side para integração com o W1nner (w1nner.w1consultoria.com.br)
// NUNCA expor no client-side.

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { fetchWithRetry } from './retry';
import { reportError } from './log';

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

// ─── Cookie jar (lida com rotação de sessão do Rails) ─────────

type Jar = Map<string, string>;

function parseCookieHeader(cookieStr: string): Jar {
  const jar: Jar = new Map();
  for (const part of cookieStr.split(';')) {
    const idx = part.indexOf('=');
    if (idx > 0) jar.set(part.slice(0, idx).trim(), part.slice(idx + 1).trim());
  }
  return jar;
}

function getSetCookies(res: Response): string[] {
  const h = res.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof h.getSetCookie === 'function') return h.getSetCookie();
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function applySetCookies(jar: Jar, setCookies: string[]) {
  for (const sc of setCookies) {
    const first = sc.split(';')[0];
    const idx = first.indexOf('=');
    if (idx > 0) {
      const name = first.slice(0, idx).trim();
      const value = first.slice(idx + 1).trim();
      if (value && value !== 'deleted') jar.set(name, value);
    }
  }
}

function jarToHeader(jar: Jar): string {
  return [...jar.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
}

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36';

// ─── Sessão ───────────────────────────────────────────────────

/**
 * Faz login no W1nner e retorna o cookie de sessão (jar serializado).
 * Nunca armazena a senha — só o cookie.
 */
export async function winnerLogin(email: string, password: string): Promise<string | null> {
  // 1. GET na página de login para obter CSRF + cookie inicial
  const loginPage = await fetch(`${BASE}/entrar`, {
    headers: { 'User-Agent': UA },
    redirect: 'manual',
  });
  const html = await loginPage.text();
  const jar = parseCookieHeader('');
  applySetCookies(jar, getSetCookies(loginPage));

  const csrfMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (!csrfMatch) return null;
  const csrf = csrfMatch[1];

  // 2. POST com credenciais
  const loginRes = await fetch(`${BASE}/entrar`, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': UA,
      'Cookie': jarToHeader(jar),
    },
    body: new URLSearchParams({
      'utf8': '✓',
      'authenticity_token': csrf,
      'consultant_person[email]': email,
      'consultant_person[password]': password,
      'commit': 'Logar',
    }),
  });

  // Sucesso = redirect (302) para área logada. Falha = 200 (re-renderiza login).
  if (loginRes.status !== 302) return null;

  applySetCookies(jar, getSetCookies(loginRes));
  // O cookie de sessão do W1nner é "_w1_platform_session"
  if (!jar.has('_w1_platform_session') && jar.size === 0) return null;
  return jarToHeader(jar);
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
): Promise<{ ok: boolean; error?: string; eventId?: string; expirada?: boolean }> {
  const jar = parseCookieHeader(sessionCookie);

  // 1. GET na página de novo evento para obter CSRF + atualizar cookie
  //    (GET é idempotente — retry seguro em falha transitória)
  let newPage: Response;
  try {
    newPage = await fetchWithRetry(`${BASE}/agenda/new`, {
      headers: { 'User-Agent': UA, 'Cookie': jarToHeader(jar) },
      redirect: 'manual',
    });
  } catch (e) {
    reportError('winner.criarEvento.get', e);
    return { ok: false, error: 'Falha de conexão com o W1nner. Tente de novo.' };
  }

  // Redirect para login = sessão expirada
  if (newPage.status >= 300 && newPage.status < 400) {
    const loc = newPage.headers.get('location') || '';
    if (/entrar|login|sign_in/.test(loc)) return { ok: false, expirada: true, error: 'sessão expirada' };
  }
  applySetCookies(jar, getSetCookies(newPage));

  const html = await newPage.text();
  // Página de login devolvida com 200 = sessão expirada
  if (html.includes('consultant_person[email]') || html.includes('consultant_person_email')) {
    return { ok: false, expirada: true, error: 'sessão expirada' };
  }

  const csrfMatch = html.match(/name="authenticity_token"\s+value="([^"]+)"/);
  if (!csrfMatch) return { ok: false, expirada: true, error: 'CSRF não encontrado — sessão expirada' };
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

  // 3. POST — usa o cookie atualizado + token no header e no corpo.
  //    NÃO usa retry: não é idempotente (evitar evento duplicado).
  let res: Response;
  try {
    res = await fetch(`${BASE}/agenda`, {
      method: 'POST',
      redirect: 'manual',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': UA,
        'Cookie': jarToHeader(jar),
        'X-CSRF-Token': csrf,
        'X-Requested-With': 'XMLHttpRequest',
        'Origin': 'https://w1nner.w1consultoria.com.br',
        'Referer': `${BASE}/agenda/new`,
      },
      body,
    });
  } catch (e) {
    reportError('winner.criarEvento.post', e);
    return { ok: false, error: 'Falha de conexão ao salvar no W1nner. Verifique se o evento foi criado antes de tentar de novo.' };
  }

  // Sucesso = 302 para /agenda/{id} (ou /agenda)
  if (res.status === 302) {
    const location = res.headers.get('location') || '';
    if (/entrar|login|sign_in/.test(location)) return { ok: false, expirada: true, error: 'sessão expirada' };
    const idMatch = location.match(/agenda\/(\d+)/);
    return { ok: true, eventId: idMatch?.[1] };
  }

  // 422 = token CSRF inválido / sessão inconsistente
  if (res.status === 422) {
    return { ok: false, expirada: true, error: 'Sessão do W1nner inválida. Reconecte sua conta do W1nner.' };
  }

  if (res.status === 200) {
    const respHtml = await res.text();
    const errorMatch = respHtml.match(/class="alert[^"]*alert-danger[^"]*"[^>]*>([\s\S]{0,300})/);
    if (errorMatch) {
      const msg = errorMatch[1].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
      return { ok: false, error: msg || 'Erro de validação no W1nner' };
    }
    // Lista de erros do Rails (error_explanation)
    const liErros = [...respHtml.matchAll(/error_explanation[\s\S]{0,600}?<\/div>/g)];
    if (liErros.length) {
      const itens = [...liErros[0][0].matchAll(/<li[^>]*>([^<]+)<\/li>/g)].map(m => m[1].trim());
      if (itens.length) return { ok: false, error: itens.join('; ') };
    }
    return { ok: true };
  }

  return { ok: false, error: `Status inesperado: ${res.status}` };
}

/**
 * Busca a lista de contatos do W1nner para o usuário logado.
 * Retorna id + nome para mapeamento no CRM.
 */
export async function winnerListarContatos(sessionCookie: string): Promise<{ id: string; nome: string }[] | null> {
  const jar = parseCookieHeader(sessionCookie);
  const page = await fetch(`${BASE}/agenda/new`, {
    headers: { 'User-Agent': UA, 'Cookie': jarToHeader(jar) },
    redirect: 'manual',
  });
  // Redirect ou página de login = sessão expirada
  if (page.status >= 300 && page.status < 400) return null;
  const html = await page.text();
  if (html.includes('consultant_person[email]') || html.includes('consultant_person_email')) return null;

  // Isola SOMENTE o <select name="calendar_event[contact_id]"> (contatos do consultor),
  // ignorando os selects de consultor/escritório/sala.
  const selIdx = html.indexOf('calendar_event[contact_id]');
  if (selIdx === -1) return [];
  const selStart = html.indexOf('>', selIdx);
  const selEnd = html.indexOf('</select>', selStart);
  const bloco = html.slice(selStart, selEnd === -1 ? undefined : selEnd);

  const matches = [...bloco.matchAll(/<option value="(\d+)"[^>]*>([^<]+)<\/option>/g)];
  // Remove duplicados por id
  const vistos = new Set<string>();
  const out: { id: string; nome: string }[] = [];
  for (const m of matches) {
    if (vistos.has(m[1])) continue;
    vistos.add(m[1]);
    out.push({ id: m[1], nome: m[2].trim() });
  }
  out.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  return out;
}
// ─── Adicionar ao final de lib/winner.ts ─────────────────────

// ─── Substitui as funções winnerListarPropostas e parsePropostasTable
// em lib/winner.ts (apaga as versões anteriores e cola este)

export interface WinnerProposta {
  id:              string;
  status:          string;
  data_assinatura: string | null;
  cliente:         string;
  parceira:        string;
  produto:         string;
  pps:             number;
  ap_valor:        number;
}

export async function winnerListarPropostas(
  sessionCookie: string,
  consultantId  = '64551',
  pagElements   = '200',
): Promise<WinnerProposta[] | null> {
  const jar = parseCookieHeader(sessionCookie);

  const params = new URLSearchParams({
    'utf8':                                      '✓',
    'search[by_structure_type][consultant_id]':  consultantId,
    'search[by_structure_type][type]':           'only_consultant',
    'search[status_eq]':                         '',
    'search[page_elements]':                     pagElements,
  });

  let res: Response;
  try {
    res = await fetch(
      `${BASE}/propostas-de-produto?${params.toString()}`,
      {
        headers: { 'User-Agent': UA, 'Cookie': jarToHeader(jar) },
        redirect: 'manual',
      },
    );
  } catch {
    return null;
  }

  if (res.status >= 300 && res.status < 400) return null;
  const html = await res.text();
  if (html.includes('consultant_person[email]')) return null;

  return parsePropostasTable(html);
}

function parsePropostasTable(html: string): WinnerProposta[] {
  // A página tem dois <tbody>: o primeiro é o resumo por status,
  // o segundo contém os contratos individuais — usamos o segundo.
  const allTbodies = [...html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/g)];
  const tbody = allTbodies[1]?.[1] ?? allTbodies[0]?.[1] ?? '';
  if (!tbody) return [];

  const rows = [...tbody.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)];
  const result: WinnerProposta[] = [];

  for (const row of rows) {
    const cells = [...row[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map(m =>
      m[1].replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim(),
    );

    // Colunas confirmadas via console do Winner:
    // 0:id  1:status  2:dias  3:data_assinatura  4:cliente
    // 5:cpf  6:responsavel  7:parceira  8:produto
    // 9:ap_valor  10:pps  11:vip  12:acoes
    if (cells.length < 10) continue;
    const id = cells[0]?.replace(/\D/g, '').trim();
    if (!id) continue;

    const dataRaw = cells[3]?.trim();
    const data_assinatura = dataRaw && /\d{2}\/\d{2}\/\d{4}/.test(dataRaw)
      ? dataRaw.split('/').reverse().join('-')
      : null;

    const apRaw  = cells[9]?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0';
    const ppsRaw = cells[10]?.replace(/[^\d,]/g, '').replace(',', '.') ?? '0';

    result.push({
      id,
      status:          cells[1]  ?? '',
      data_assinatura,
      cliente:         cells[4]  ?? '',
      parceira:        cells[7]  ?? '',
      produto:         cells[8]  ?? '',
      pps:             parseFloat(ppsRaw) || 0,
      ap_valor:        parseFloat(apRaw)  || 0,
    });
  }

  return result;
}
