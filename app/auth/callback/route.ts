import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

/**
 * Callback do OAuth (Google).
 * 1. Troca o code pela sessão Supabase.
 * 2. Captura provider_token (access_token Google) + provider_refresh_token
 *    e salva na tabela google_tokens para uso server-side posterior
 *    (consultas a Google Calendar API).
 * 3. Redireciona para /, que por sua vez decide /dashboard (líder) ou /daily.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const errorParam = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');
  const next = searchParams.get('next') ?? '/';

  if (errorParam) {
    const msg = encodeURIComponent(errorDescription || errorParam);
    return NextResponse.redirect(`${origin}/login?error=${msg}`);
  }

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent('Código de autorização ausente')}`);
  }

  const supabase = await getSupabaseServer();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // Captura tokens do provedor Google e armazena em google_tokens.
  // O Supabase só retorna provider_token / provider_refresh_token NESSE momento
  // (após o exchange). Depois disso eles ficam só no JWT internamente.
  const session = data?.session;
  const userId = session?.user?.id;
  const providerToken = session?.provider_token;
  const providerRefreshToken = session?.provider_refresh_token;

  if (userId && providerToken) {
    // access_token do Google dura ~1h. Salvamos com margem.
    const expiresAt = new Date(Date.now() + 55 * 60 * 1000).toISOString();

    // upsert com refresh_token apenas se vier (se já tiver no banco e não vier
    // outro novo, mantemos o antigo). access_token sempre atualiza.
    const tokenRow: Record<string, unknown> = {
      user_id: userId,
      access_token: providerToken,
      expires_at: expiresAt,
      scope: 'https://www.googleapis.com/auth/calendar.readonly',
      updated_at: new Date().toISOString(),
    };
    if (providerRefreshToken) {
      tokenRow.refresh_token = providerRefreshToken;
    }

    const { error: tokenError } = await supabase
      .from('google_tokens')
      .upsert(tokenRow, { onConflict: 'user_id' });

    if (tokenError) {
      // Não bloqueia o login se falhar — só loga.
      console.error('[auth/callback] erro salvando google_tokens:', tokenError.message);
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
