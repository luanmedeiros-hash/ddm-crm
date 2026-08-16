import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getWinnerSession } from '@/lib/winner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const preferredRegion = 'gru1';

const BASE = 'https://w1nner.w1consultoria.com.br/painel-consultor';
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

export async function GET() {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const cookie = await getWinnerSession(supabase, user.id);
  if (!cookie) return NextResponse.json({ ok: false, error: 'winner_not_connected' }, { status: 403 });

  const params = new URLSearchParams({
    'search[by_structure_type][consultant_id]': '64551',
    'search[by_structure_type][type]': 'only_consultant',
    'search[page_elements]': '200',
  });

  const res = await fetch(`${BASE}/propostas-de-produto?${params}`, {
    headers: {
      'User-Agent': UA,
      'Cookie': cookie,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'pt-BR,pt;q=0.9',
      'Referer': `${BASE}/propostas-de-produto`,
      'Connection': 'keep-alive',
    },
    redirect: 'follow',
  });

  const html = await res.text();
  return NextResponse.json({ ok: true, status: res.status, htmlLength: html.length, inicio: html.substring(0, 200) });
}
