'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ContatoStatus } from '@/lib/types';
import TimelinePessoa from './TimelinePessoa';

const STATUS_LABEL: Record<ContatoStatus, string> = {
  novo: 'Novo',
  contatado: 'Contatado',
  reuniao_agendada: 'Reunião agendada',
  convertido: 'Convertido',
  perdido: 'Perdido',
};

const STATUS_ORDER: ContatoStatus[] = ['novo', 'contatado', 'reuniao_agendada', 'convertido', 'perdido'];

const STATUS_COLOR: Record<ContatoStatus, { bg: string; fg: string }> = {
  novo: { bg: 'rgba(99,102,241,.15)', fg: '#5457d6' },
  contatado: { bg: 'rgba(245,158,11,.15)', fg: '#F59E0B' },
  reuniao_agendada: { bg: 'rgba(34,160,90,.15)', fg: '#1a8a4a' },
  convertido: { bg: 'rgba(34,160,90,.22)', fg: '#137a3e' },
  perdido: { bg: 'rgba(120,120,120,.15)', fg: '#777' },
};

type FormState = {
  id?: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  status: ContatoStatus;
  origem: string | null;
  notas: string | null;
  proximo_contato: string | null;
};

const EMPTY_FORM: FormState = {
  nome: '',
  telefone: '',
  email: '',
  status: 'novo',
  origem: '',
  notas: '',
  proximo_contato: null,
};

export default function Contatos() {
  const [contatos, setContatos] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | ContatoStatus>('todos');
  const [busca, setBusca] = useState('');
  const [modal, setModal] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'lead')
      .order('proximo_contato', { ascending: true, nullsFirst: false });
    if (error) {
      setErro(error.message);
    } else {
      setContatos((data as Pessoa[]) || []);
      setErro('');
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const filtrados = useMemo(() => {
    return contatos.filter(c => {
      const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const okBusca = !busca || c.nome.toLowerCase().includes(busca.toLowerCase());
      return okStatus && okBusca;
    });
  }, [contatos, filtroStatus, busca]);

  const abrirNovo = () => { setErro(''); setModal({ ...EMPTY_FORM }); };
  const abrirEditar = (c: Pessoa) => {
    setErro('');
    setModal({
      id: c.id,
      nome: c.nome,
      telefone: c.telefone || '',
      email: c.email || '',
      status: (STATUS_ORDER.includes(c.status as ContatoStatus) ? c.status as ContatoStatus : 'novo'),
      origem: c.origem || '',
      notas: c.notas || '',
      proximo_contato: c.proximo_contato,
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
      proximo_contato: modal.proximo_contato || null,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (modal.id) {
      ({ error } = await supabase.from('pessoas').update(payload).eq('id', modal.id));
    } else {
      ({ error } = await supabase.from('pessoas').insert({ ...payload, fase: 'lead', user_id: user.id }));
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
    if (!confirm(`Excluir o contato "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('pessoas').delete().eq('id', c.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    carregar();
  };

  const converterEmCliente = async (c: Pessoa) => {
    if (!confirm(`Converter "${c.nome}" em cliente? Ele sairá da lista de Contatos e passará a aparecer em Clientes.`)) return;

    // Mesma pessoa, só muda de fase (refactor Opção A).
    const { error } = await supabase.from('pessoas')
      .update({
        fase: 'cliente',
        status: 'ativo',
        data_inicio: new Date().toISOString().slice(0, 10),
        convertido_em: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq('id', c.id);

    if (error) { alert('Erro ao converter: ' + error.message); return; }

    carregar();
    alert(`"${c.nome}" foi convertido em cliente!`);
  };

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Contatos</div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 2 }}>
            {contatos.length} contato{contatos.length !== 1 ? 's' : ''} · leads para reuniões
          </div>
        </div>
        <button onClick={abrirNovo} style={btnPrimary}>+ Adicionar contato</button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button onClick={() => setFiltroStatus('todos')} style={filtroStatus === 'todos' ? pillActive : pill}>Todos</button>
          {STATUS_ORDER.map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={s === filtroStatus ? pillActive : pill}>
              {STATUS_LABEL[s]}
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
          Nenhum contato encontrado.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtrados.map(c => {
            const col = STATUS_COLOR[c.status as ContatoStatus] || STATUS_COLOR.novo;
            return (
              <div key={c.id} style={card} onClick={() => abrirEditar(c)}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{c.nome}</span>
                    <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: col.bg, color: col.fg }}>
                      {STATUS_LABEL[c.status as ContatoStatus] || c.status}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                    {c.telefone && <span>📞 {c.telefone}</span>}
                    {c.email && <span>✉ {c.email}</span>}
                    {c.origem && <span>Origem: {c.origem}</span>}
                    {c.proximo_contato && <span>Próximo: {fmtData(c.proximo_contato)}</span>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  {c.status !== 'convertido' && (
                    <button onClick={(e) => { e.stopPropagation(); converterEmCliente(c); }} style={btnConverter} title="Converter em cliente">
                      → Cliente
                    </button>
                  )}
                  <button onClick={(e) => { e.stopPropagation(); excluir(c); }} style={btnDelete} title="Excluir">✕</button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div onClick={() => setModal(null)} style={overlay}>
          <div onClick={e => e.stopPropagation()} style={modalBox}>
            <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>
              {modal.id ? 'Editar contato' : 'Novo contato'}
            </div>

            <Field label="Nome *">
              <input value={modal.nome} onChange={e => setModal({ ...modal, nome: e.target.value })} style={input} placeholder="Nome do lead" />
            </Field>

            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Telefone" flex>
                <input value={modal.telefone || ''} onChange={e => setModal({ ...modal, telefone: e.target.value })} style={input} placeholder="(00) 00000-0000" />
              </Field>
              <Field label="Status" flex>
                <select value={modal.status} onChange={e => setModal({ ...modal, status: e.target.value as ContatoStatus })} style={input}>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
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
              <Field label="Próximo contato" flex>
                <input type="date" value={modal.proximo_contato || ''} onChange={e => setModal({ ...modal, proximo_contato: e.target.value || null })} style={input} />
              </Field>
            </div>

            <Field label="Notas">
              <textarea value={modal.notas || ''} onChange={e => setModal({ ...modal, notas: e.target.value })} rows={3} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Contexto, objetivo, próximos passos..." />
            </Field>

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

function fmtData(iso: string) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
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
const btnDelete: React.CSSProperties = { width: 28, height: 28, borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 };
const btnConverter: React.CSSProperties = { padding: '5px 10px', borderRadius: 6, border: '1px solid rgba(34,160,90,.4)', background: 'rgba(34,160,90,.1)', color: '#1a8a4a', cursor: 'pointer', fontSize: 11.5, fontWeight: 700, whiteSpace: 'nowrap' };
const pill: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' };
const pillActive: React.CSSProperties = { ...pill, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const card: React.CSSProperties = { display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-card)', border: '1px solid var(--line)', cursor: 'pointer' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' };
