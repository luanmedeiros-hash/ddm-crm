'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setError('');
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError(error.message);
    } else {
      router.push('/dashboard');
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

        <form onSubmit={handleLogin}>
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
            {error && (
              <div className="field span-4" style={{ color: 'var(--crit)', fontSize: 12.5, padding: '8px 12px', background: 'rgba(220,38,38,.08)', borderRadius: 8 }}>
                {error}
              </div>
            )}
            <div className="field span-4">
              <button
                type="submit"
                className="action-btn primary"
                disabled={loading}
                style={{ width: '100%', justifyContent: 'center', padding: '12px' }}
              >
                {loading ? 'Entrando...' : 'Entrar'}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
