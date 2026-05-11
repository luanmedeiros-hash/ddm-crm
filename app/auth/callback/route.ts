import { NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { FEATURES } from '@/lib/features';

export const dynamic = 'force-dynamic';

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

  if (FEATURES.GOOGLE_CALENDAR || FEATURES.CALENDAR_DAILY) {
    const session = data?.session;
    const userId = session?.user?.id;
    const providerToken = session?.provider_token;
    const providerRefreshToken = session?.provider_refresh_token;

    if (userId && providerToken) {
      // Usa expires_in da sessão se disponível; fallback 55min
      const expiresIn: number = (session as unknown as Record<string, unknown>)?.provider_token_expiry
        ? Number((session as unknown as Record<string, unknown>).provider_token_expiry)
        : 3600;
      const expiresAt = new Date(Date.now() + (expiresIn - 60) * 1000).toISOString();

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
        console.error('[auth/callback] erro salvando google_tokens:', tokenError.message);
      }
    }
  }

  return NextResponse.redirect(`${origin}${next}`);
}
