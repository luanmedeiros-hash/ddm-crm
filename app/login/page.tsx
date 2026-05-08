'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';

function LoginInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showEmailLogin, setShowEmailLogin] = useState(false);

  // Pega erro vindo do callback (?error=...)
  useEffect(() => {
    const err = searchParams.get('error');
    if (err) setError(decodeURIComponent(err));
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setGoogleLoading(true);
    setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });
    if (error) {
      setError(error.message);
      setGoogleLoading(false);
    }
    // Em sucesso, o navegador é redirecionado para o Google
  };

  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div style={{
      minHeight: '100vh', background: 'var(--bg-page)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
    }}>
      <div className="card" style={{ width: '100%', maxWidth: 400, padding: '32px 28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
          <div className="brand-logo" style={{ width: 48, height: 48, fontSize: 24 }}>🪣</div>
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: '-.02em', color: 'var(--text)' }}>CRM Baldada</div>
            <div style={{ fontSize: 12, color: 'var(--muted)' }}>Faça login para continuar</div>
          </div>
        </div>

        {/* BOTÃO GOOGLE — primário */}
        <button
          type="button"
          onClick={handleGoogleLogin}
          disabled={googleLoading || loading}
          className="google-btn"
        >
          <GoogleIcon />
          <span>{googleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
        </button>

        <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', marginTop: 10, lineHeight: 1.5 }}>
          Use o mesmo Gmail cadastrado no time.<br />
          Acesso liberado para os 13 consultores e 2 líderes.
        </div>

        {error && (
          <div style={{ color: 'var(--crit)', fontSize: 12.5, padding: '10px 12px', background: 'rgba(220,38,38,.08)', borderRadius: 8, marginTop: 14 }}>
            {error}
          </div>
        )}

        {/* DIVISOR */}
        <div className="login-divider">
          <span>ou</span>
        </div>

        {/* TOGGLE: mostrar email/senha (fallback) */}
        {!showEmailLogin ? (
          <button
            type="button"
            className="link-btn"
            style={{ display: 'block', margin: '0 auto', fontSize: 12.5 }}
            onClick={() => setShowEmailLogin(true)}
          >
            Entrar com e-mail e senha
          </button>
        ) : (
          <form onSubmit={handleEmailLogin}>
            <div className="form-grid">
              <div className="field span-4">
                <label>E-mail</label>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
              </div>
              <div className="field span-4">
                <label>Senha</label>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </div>
              <div className="field span-4">
                <button
                  type="submit"
                  className="action-btn primary"
                  disabled={loading || googleLoading}
                  style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
                >
                  {loading ? 'Entrando...' : 'Entrar'}
                </button>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div />}>
      <LoginInner />
    </Suspense>
  );
}
