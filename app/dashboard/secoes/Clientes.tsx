'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ClienteStatus } from '@/lib/types';
import TimelinePessoa from './TimelinePessoa';

const STATUS_LABEL: Record<ClienteStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

const CHECK_LABELS = ['C1', 'C2', 'C3', 'C4'] as const;

type FormState = {
  id?: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: ClienteStatus;
  origem: string | null;
  notas: string | null;
  data_inicio: string | null;
  c1: boolean;
  c2: boolean;
  c3: boolean;
  c4: boolean;
};

const EMPTY_FORM: FormState = {
  nome: '',
  telefone: '',
  email: '',
  status: 'ativo',
  origem: '',
  notas: '',
  data_inicio: null,
  c1: false,
  c2: false,
  c3: false,
  c4: false,
};

export default function Clientes() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | ClienteStatus>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'cliente')
      .order('nome', { ascending: true });
    if (error) {
      setErro(error.message);
    } else {
      setClientes((data as Pessoa[]) || []);
      setErro('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    return clientes.filter(c => {
      const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const okBusca = !busca || c.nome.toLowerCase().includes(busca.toLowerCase());
      return okStatus && okBusca;
    });
  }, [clientes, filtroStatus, busca]);

  const ativos = clientes.filter(c => c.status === 'ativo').length;
  const inativos = clientes.filter(c => c.status === 'inativo').length;

  const abrirNovo = () => { setErro(''); setModal({ ...EMPTY_FORM }); };
  const abrirEditar = (c: Pessoa) => {
    setErro('');
    setModal({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone || '',
      email: c.email || '',
      status: (c.status === 'inativo' ? 'inativo' : 'ativo'),
      origem: c.origem || '',
      notas: c.notas || '',
      data_inicio: c.data_inicio,
      c1: c.c1, c2: c.c2, c3: c.c3, c4: c.c4,
    });
  };

  const salvar = async () => {
    if (!modal) return;
    if (!modal.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true);
    setErro('');

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada. Faça login novamente.'); setSaving(false); return; }

    const payload = {
      nome: modal.nome.trim(),
      telefone: modal.telefone || null,
      email: modal.email || null,
      status: modal.status,
      origem: modal.origem || null,
      notas: modal.notas || null,
      data_inicio: modal.data_inicio || null,
      c1: modal.c1, c2: modal.c2, c3: modal.c3, c4: modal.c4,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (modal.id) {
      ({ error } = await supabase.from('pessoas').update(payload).eq('id', modal.id));
    } else {
      ({ error } = await supabase.from('pessoas').insert({ ...payload, fase: 'cliente', user_id: user.id }));
    }

    if (error) {
      setErro(error.message);
      setSaving(false);
    } else {
      setSaving(false);
      setModal(null);
      carregar();
    }
  };

  const excluir = async (c: Pessoa) => {
    if (!confirm(`Excluir o cliente "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('pessoas').delete().eq('id', c.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    carregar();
  };

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Clientes</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {ativos} ativo{ativos !== 1 ? 's' : ''} · {inativos} inativo{inativos !== 1 ? 's' : ''}
          </div>
        </div>
        <button onClick={abrirNovo} style={btnPrimary}>+ Adicionar cliente</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['todos', 'ativo', 'inativo'] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)}
              style={s === filtroStatus ? pillActive : pill}>
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome..."
          style={{ flex: 1, minWidth: 180, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13 }}
        />
      </div>

      {erro && <div style={errorBox}>{erro}</div>}

      {/* Lista */}
      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : filtrados.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum cliente {filtroStatus !== 'todos' ? STATUS_LABEL[filtroStatus as ClienteStatus].toLowerCase() : ''} encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(c => (
            <div key={c.id} style={card} onClick={() => abrirEditar(c)}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</span>
                  <span style={c.status === 'ativo' ? badgeAtivo : badgeInativo}>{STATUS_LABEL[c.status as ClienteStatus]}</span>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                  {c.telefone && <span>📞 {c.telefone}</span>}
                  {c.email && <span>✉ {c.email}</span>}
                  {c.origem && <span>Origem: {c.origem}</span>}
                </div>
                {(c.c1 || c.c2 || c.c3 || c.c4) && (
                  <div style={{ display: 'flex', gap: 5, marginTop: 6 }}>
                    {CHECK_LABELS.map((lbl, i) => {
                      const val = [c.c1, c.c2, c.c3, c.c4][i];
                      return val ? <span key={lbl} style={chip}>{lbl}</span> : null;
                    })}
                  </div>
                )}
              </div>
              <button onClick={(e) => { e.stopPropagation(); excluir(c); }} style={btnDelete} title="Excluir">✕</button>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
              {modal.id ? 'Editar cliente' : 'Novo cliente'}
            </div>

            <Field label="Nome *">
              <input value={modal.nome} onChange={e => setModal({ ...modal, nome: e.target.value })} style={input} placeholder="Nome do cliente" />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Telefone" flex>
                <input value={modal.telefone || ''} onChange={e => setModal({ ...modal, telefone: e.target.value })} style={input} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Status" flex>
                <select value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value as ClienteStatus })} style={input}>
                  <option value="ativo">Ativo</option>
                  <option value="inativo">Inativo</option>
                </select>
              </Field>
            </div>

            <Field label="Email">
              <input value={modal.email || ''} onChange={e => setModal({ ...modal, email: e.target.value })} style={input} placeholder="email@exemplo.com" />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Origem" flex>
                <input value={modal.origem || ''} onChange={e => setModal({ ...modal, origem: e.target.value })} style={input} placeholder="Indicação, evento..." />
              </Field>
              <Field label="Data de início" flex>
                <input type="date" value={modal.data_inicio || ''} onChange={e => setModal({ ...modal, data_inicio: e.target.value || null })} style={input} />
              </Field>
            </div>

            <Field label="Notas">
              <textarea value={modal.notas || ''} onChange={e => setModal({ ...modal, notas: e.target.value })} rows={3} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Observações..." />
            </Field>

            <div style={{ marginTop: 4, marginBottom: 16 }}>
              <div style={labelStyle}>Marcadores</div>
              <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
                {CHECK_LABELS.map((lbl, i) => {
                  const key = (['c1', 'c2', 'c3', 'c4'] as const)[i];
                  return (
                    <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                      <input type="checkbox" checked={modal[key]} onChange={e => setModal({ ...modal, [key]: e.target.checked })} />
                      {lbl}
                    </label>
                  );
                })}
              </div>
            </div>

            {modal.id && <TimelinePessoa pessoaId={modal.id} />}

            {erro && <div style={errorBox}>{erro}</div>}

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
              <button onClick={() => setModal(null)} style={btnGhost}>Cancelar</button>
              <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
                {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
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

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' };
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const btnDelete: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 };
const pill: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' };
const pillActive: React.CSSProperties = { ...pill, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const card: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' };
const badgeAtivo: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(34,160,90,.15)', color: '#1a8a4a' };
const badgeInativo: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(120,120,120,.15)', color: 'var(--muted)' };
const chip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(245,158,11,.15)', color: '#F59E0B' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' };
