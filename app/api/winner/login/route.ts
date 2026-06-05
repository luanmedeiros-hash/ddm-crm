// POST /api/winner/login
// Body: { email, password }
// Faz login no W1nner e salva o cookie de sessão no banco.
// Nunca persiste a senha.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { winnerLogin, saveWinnerSession } from '@/lib/winner';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  let body: { email?: string; password?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { email, password } = body;
  if (!email?.trim() || !password) {
    return NextResponse.json({ ok: false, error: 'email e senha são obrigatórios' }, { status: 400 });
  }

  const cookie = await winnerLogin(email.trim(), password);
  if (!cookie) {
    return NextResponse.json({ ok: false, error: 'Credenciais inválidas ou W1nner indisponível.' }, { status: 401 });
  }

  await saveWinnerSession(supabase, user.id, email.trim(), cookie);
  return NextResponse.json({ ok: true });
}
