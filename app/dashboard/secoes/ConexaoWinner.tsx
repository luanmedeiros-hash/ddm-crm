'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function ConexaoWinner() {
  const [conectado, setConectado] = useState<string | null>(null); // email conectado
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ email: '', senha: '' });
  const [salvando, setSalvando] = useState(false);
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'erro'; texto: string } | null>(null);

  useEffect(() => {
    supabase.from('winner_sessions').select('winner_email').limit(1).maybeSingle()
      .then(({ data }) => { setConectado(data?.winner_email || null); setLoading(false); });
  }, []);

  const conectar = async () => {
    if (!form.email.trim() || !form.senha) { setMsg({ tipo: 'erro', texto: 'Preencha email e senha.' }); return; }
    setSalvando(true); setMsg(null);
    try {
      const res = await fetch('/api/winner/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), password: form.senha }),
      });
      const json = await res.json();
      if (json.ok) {
        setConectado(form.email.trim());
        setForm({ email: '', senha: '' });
        setMsg({ tipo: 'ok', texto: 'Conta W1nner conectada com sucesso!' });
      } else {
        setMsg({ tipo: 'erro', texto: json.message || json.error || 'Erro ao conectar.' });
      }
    } catch {
      setMsg({ tipo: 'erro', texto: 'Erro de conexão.' });
    }
    setSalvando(false);
  };

  const desconectar = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    await supabase.from('winner_sessions').delete().eq('user_id', user.id);
    setConectado(null);
    setMsg({ tipo: 'ok', texto: 'Conta W1nner desconectada.' });
  };

  if (loading) return null;

  return (
    <div style={{ padding: '16px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <span style={{ fontSize: 20 }}>🏆</span>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>W1nner</div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>
            {conectado ? `Conectado como ${conectado}` : 'Não conectado'}
          </div>
        </div>
        {conectado && (
          <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: 'rgba(34,197,94,.12)', color: '#16a34a' }}>
            ● Ativo
          </span>
        )}
      </div>

      {msg && (
        <div style={{
          padding: '8px 12px', borderRadius: 8, fontSize: 12.5, marginBottom: 12,
          background: msg.tipo === 'ok' ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
          border: `1px solid ${msg.tipo === 'ok' ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
          color: msg.tipo === 'ok' ? '#16a34a' : '#ef4444',
        }}>
          {msg.texto}
        </div>
      )}

      {conectado ? (
        <button onClick={desconectar} style={btnGhost}>Desconectar</button>
      ) : (
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              type="email"
              placeholder="Email W1nner"
              style={input}
            />
            <input
              value={form.senha}
              onChange={e => setForm({ ...form, senha: e.target.value })}
              type="password"
              placeholder="Senha W1nner"
              style={input}
              onKeyDown={e => e.key === 'Enter' && conectar()}
            />
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 10 }}>
            Sua senha não é armazenada — apenas o cookie de sessão (válido por ~2 semanas).
          </div>
          <button onClick={conectar} disabled={salvando} style={{ ...btnPrimary, opacity: salvando ? 0.7 : 1 }}>
            {salvando ? 'Conectando...' : 'Conectar ao W1nner'}
          </button>
        </div>
      )}
    </div>
  );
}

const input: React.CSSProperties = { flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13 };
const btnPrimary: React.CSSProperties = { padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
