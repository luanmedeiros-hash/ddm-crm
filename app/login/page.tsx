'use client';

import React, { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import ShaderBackground from '@/components/ShaderBackground';

function LoginInner() {
  const searchParams = useSearchParams();
  const [error, setError] = useState('');
  const [googleLoading, setGoogleLoading] = useState(false);

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
        scopes: 'openid email profile https://www.googleapis.com/auth/calendar.events',
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
  };

  return (
    <div className="login-split">
      <aside className="login-split-visual">
        <ShaderBackground />
        <div className="login-split-visual-content">
          <div className="login-split-brand">
            <span style={{ fontSize: 20 }}>🪣</span> CRM Baldada
          </div>
          <div className="login-split-tagline">
            <h1>A disciplina virou <span className="accent">número.</span></h1>
            <p>Acompanhe o funil consultivo, a jornada de cada cliente e a performance da equipe — tudo em um só lugar.</p>
            <div className="login-features">
              <div className="login-feature"><span className="lf-ico">📊</span> Funil e métricas da equipe em tempo real</div>
              <div className="login-feature"><span className="lf-ico">🗺️</span> Jornada do cliente da Análise ao Acompanhamento</div>
              <div className="login-feature"><span className="lf-ico">📅</span> Agenda integrada ao Google Calendar</div>
            </div>
          </div>
          <div className="login-split-footer">© 2026 Equipe Baldada · W1 Partner</div>
        </div>
      </aside>

      <main className="login-split-form">
        <div className="login-split-form-inner">
          <div className="login-split-logo" style={{ width: 88, height: 88, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56, lineHeight: 1 }}>🪣</div>

          <div className="login-split-form-header">
            <h2>CRM Baldada</h2>
            <p>Faça login para continuar</p>
          </div>

          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={googleLoading}
            className="login-split-google-btn"
          >
            <GoogleIcon />
            <span>{googleLoading ? 'Conectando...' : 'Entrar com Google'}</span>
          </button>

          {error && <div className="login-split-error">{error}</div>}

          <div className="login-split-divider" />

          <div className="login-split-disclaimer">
            Acesso restrito à equipe Baldada
          </div>
        </div>
      </main>
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
