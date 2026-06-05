'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import ConexaoWinner from './ConexaoWinner';

interface MembroEquipe {
  id: string;
  nome: string;
  email: string;
  role: 'lider' | 'liderado';
  consultor_nome: string | null;
  created_at: string;
}

type FormState = {
  nome: string;
  email: string;
  role: 'lider' | 'liderado';
};

const EMPTY_FORM: FormState = { nome: '', email: '', role: 'liderado' };

export default function Equipe() {
  const [membros, setMembros] = useState<MembroEquipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [sucesso, setSucesso] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('profiles')
      .select('id, nome, email, role, consultor_nome, created_at')
      .order('role', { ascending: true })
      .order('nome', { ascending: true });
    setMembros((data as MembroEquipe[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const convidar = async () => {
    if (!form) return;
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    if (!form.email.trim()) { setErro('Email é obrigatório.'); return; }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) { setErro('Email inválido.'); return; }

    setSaving(true); setErro(''); setSucesso('');
    try {
      const res = await fetch('/api/convidar-consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: form.nome.trim(), email: form.email.trim().toLowerCase(), role: form.role }),
      });
      const json = await res.json();
      if (!json.ok) {
        setErro(json.error || 'Erro ao convidar.');
      } else {
        const msg = json.status === 'updated'
          ? `Perfil de ${form.nome} atualizado.`
          : `Convite enviado para ${form.email}. ${form.nome} receberá um email para acessar o CRM.`;
        setSucesso(msg);
        setForm(null);
        carregar();
      }
    } catch {
      setErro('Erro de conexão.');
    }
    setSaving(false);
  };

  const lideres = membros.filter(m => m.role === 'lider');
  const consultores = membros.filter(m => m.role === 'liderado');

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {lideres.length} líder{lideres.length !== 1 ? 'es' : ''} · {consultores.length} consultor{consultores.length !== 1 ? 'es' : ''}
        </div>
        {!form && (
          <button onClick={() => { setErro(''); setSucesso(''); setForm({ ...EMPTY_FORM }); }} style={btnPrimary}>
            + Convidar membro
          </button>
        )}
      </div>

      {/* Conexão W1nner — cada usuário conecta sua própria conta */}
      <ConexaoWinner />

      {sucesso && <div style={successBox}>{sucesso}</div>}

      {/* Formulário de convite */}
      {form && (
        <div style={formCard}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Novo membro</div>

          <div style={{ display: 'flex', gap: 10 }}>
            <Field label="Nome *" flex>
              <input
                value={form.nome}
                onChange={e => setForm({ ...form, nome: e.target.value })}
                style={input}
                placeholder="Nome do consultor"
                autoFocus
              />
            </Field>
            <Field label="Perfil" flex>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'lider' | 'liderado' })} style={input}>
                <option value="liderado">Consultor</option>
                <option value="lider">Líder</option>
              </select>
            </Field>
          </div>

          <Field label="Email *">
            <input
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              style={input}
              placeholder="email@exemplo.com"
              type="email"
            />
          </Field>

          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 14, lineHeight: 1.5 }}>
            Um email de convite será enviado. O membro clica no link e já acessa o CRM.
          </div>

          {erro && <div style={errorBox}>{erro}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setForm(null); setErro(''); }} style={btnGhost}>Cancelar</button>
            <button onClick={convidar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Enviando convite...' : 'Enviar convite'}
            </button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : (
        <>
          {lideres.length > 0 && (
            <div style={{ marginBottom: 20 }}>
              <div style={sectionLabel}>Líderes</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {lideres.map(m => <CardMembro key={m.id} membro={m} onAtualizado={carregar} />)}
              </div>
            </div>
          )}

          {consultores.length > 0 && (
            <div>
              <div style={sectionLabel}>Consultores</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                {consultores.map(m => <CardMembro key={m.id} membro={m} onAtualizado={carregar} />)}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Card de membro ───────────────────────────────────────────
function CardMembro({ membro, onAtualizado }: { membro: MembroEquipe; onAtualizado: () => void }) {
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({ nome: membro.nome, email: membro.email, role: membro.role });
  const [saving, setSaving] = useState(false);
  const [reenviando, setReenviando] = useState(false);
  const [msg, setMsg] = useState('');
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true); setErro('');
    const { supabase: sb } = await import('@/lib/supabase');
    const { error } = await sb
      .from('profiles')
      .update({
        nome: form.nome.trim(),
        email: form.email.trim().toLowerCase(),
        role: form.role,
        consultor_nome: form.role === 'liderado' ? form.nome.trim() : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', membro.id);
    if (error) { setErro(error.message); setSaving(false); return; }
    setMsg('✓ Salvo');
    setTimeout(() => setMsg(''), 2500);
    setEditando(false);
    onAtualizado();
    setSaving(false);
  };

  const reenviarConvite = async () => {
    setReenviando(true); setMsg('');
    try {
      const res = await fetch('/api/convidar-consultor', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ nome: membro.nome, email: membro.email, role: membro.role }),
      });
      const json = await res.json();
      setMsg(json.ok ? '✓ Convite reenviado' : '✗ Erro ao reenviar');
      setTimeout(() => setMsg(''), 3000);
    } catch { setMsg('✗ Erro'); }
    setReenviando(false);
  };

  if (editando) {
    return (
      <div style={{ ...card, flexDirection: 'column', alignItems: 'stretch', gap: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 12 }}>Editar membro</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Nome *" flex>
            <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={input} autoFocus />
          </Field>
          <Field label="Perfil" flex>
            <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as 'lider' | 'liderado' })} style={input}>
              <option value="liderado">Consultor</option>
              <option value="lider">Líder</option>
            </select>
          </Field>
        </div>
        <Field label="Email">
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} type="email" />
        </Field>
        {erro && <div style={errorBox}>{erro}</div>}
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={() => { setEditando(false); setErro(''); setForm({ nome: membro.nome, email: membro.email, role: membro.role }); }} style={btnGhost}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={card}>
      <div style={avatar}>{(membro.nome || '?')[0].toUpperCase()}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{membro.nome}</span>
          <span style={membro.role === 'lider' ? badgeLider : badgeConsultor}>
            {membro.role === 'lider' ? 'Líder' : 'Consultor'}
          </span>
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{membro.email}</div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {msg && <span style={{ fontSize: 11, color: msg.startsWith('✓') ? '#22c55e' : '#ef4444' }}>{msg}</span>}
        <button onClick={() => setEditando(true)} style={btnSmall} title="Editar">✏️ Editar</button>
        <button onClick={reenviarConvite} disabled={reenviando} style={{ ...btnSmall, opacity: reenviando ? 0.6 : 1 }} title="Reenviar convite">
          {reenviando ? '...' : '📧'}
        </button>
      </div>
    </div>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ marginBottom: 12, flex: flex ? 1 : undefined }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ marginTop: 5 }}>{children}</div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────
const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' };
const sectionLabel: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' };
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const btnSmall: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 11.5, cursor: 'pointer' };
const card: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--line)' };
const formCard: React.CSSProperties = { padding: '18px 20px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--line)', marginBottom: 20 };
const avatar: React.CSSProperties = { width: 36, height: 36, borderRadius: 999, background: 'rgba(74,144,200,.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 15, fontWeight: 700, flexShrink: 0 };
const badgeLider: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(245,158,11,.15)', color: '#F59E0B' };
const badgeConsultor: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(74,144,200,.12)', color: 'var(--primary)' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const successBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)', borderRadius: 8, color: '#16a34a', fontSize: 12.5, marginBottom: 16 };
