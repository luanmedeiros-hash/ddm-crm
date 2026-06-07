'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ClienteStatus } from '@/lib/types';
import PerfilCliente from './PerfilCliente';
import { gerarCsv, baixarCsv, fmtDataBrCsv } from '@/lib/exportar';

const STATUS_LABEL: Record<ClienteStatus, string> = {
  ativo: 'Ativo',
  inativo: 'Inativo',
};

const CHECK_LABELS = ['C1', 'C2', 'C3', 'C4'] as const;

type SortKey = 'nome' | 'status' | 'empresa' | 'origem';
type SortDir = 'asc' | 'desc';

export default function Clientes() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [filtroStatus, setFiltroStatus] = useState<'todos' | ClienteStatus>('todos');
  const [busca, setBusca] = useState('');
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);
  const [modalNovo, setModalNovo] = useState(false);
  const [erro, setErro] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('nome');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'cliente')
      .order('nome', { ascending: true });
    if (error) { setErro(error.message); }
    else { setClientes((data as Pessoa[]) || []); setErro(''); }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    const arr = clientes.filter(c => {
      const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const okBusca = !q || [c.nome, c.email, c.telefone, c.empresa]
        .some(v => (v || '').toLowerCase().includes(q));
      return okStatus && okBusca;
    });
    const dir = sortDir === 'asc' ? 1 : -1;
    return arr.sort((a, b) => {
      const va = (a[sortKey] || '').toString().toLowerCase();
      const vb = (b[sortKey] || '').toString().toLowerCase();
      return va.localeCompare(vb, 'pt-BR') * dir;
    });
  }, [clientes, filtroStatus, busca, sortKey, sortDir]);

  const ativos = clientes.filter(c => c.status === 'ativo').length;
  const inativos = clientes.filter(c => c.status === 'inativo').length;

  const exportarCsv = () => {
    const cab = ['Nome', 'Email', 'Telefone', 'Empresa', 'Status', 'Origem', 'Data início', 'C1', 'C2 (Seguro)', 'C3 (Previdência)', 'C4 (Consórcio)', 'Produtos', 'Patrimônio', 'Renda mensal', 'Perfil de risco', 'Objetivo', 'Notas'];
    const linhas = filtrados.map(c => {
      const cx = c as Pessoa & { patrimonio?: number; renda_mensal?: number; perfil_risco?: string; produtos?: string[]; objetivo?: string };
      return [
        c.nome, c.email, c.telefone, c.empresa,
        c.status === 'ativo' ? 'Ativo' : 'Inativo',
        c.origem,
        fmtDataBrCsv(c.data_inicio),
        c.c1 ? 'Sim' : 'Não',
        c.c2 ? 'Sim' : 'Não',
        c.c3 ? 'Sim' : 'Não',
        c.c4 ? 'Sim' : 'Não',
        cx.produtos,
        cx.patrimonio ?? '',
        cx.renda_mensal ?? '',
        cx.perfil_risco ?? '',
        cx.objetivo ?? '',
        c.notas,
      ];
    });
    const csv = gerarCsv(cab, linhas);
    const data = new Date().toISOString().slice(0, 10);
    baixarCsv(csv, `clientes-${data}.csv`);
  };

  const excluir = async (c: Pessoa, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm(`Excluir o cliente "${c.nome}"? Esta ação não pode ser desfeita.`)) return;
    const { error } = await supabase.from('pessoas').delete().eq('id', c.id);
    if (error) { alert('Erro ao excluir: ' + error.message); return; }
    carregar();
  };

  return (
    <div style={{ padding: '4px 2px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, marginBottom: 18 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {ativos} ativo{ativos !== 1 ? 's' : ''} · {inativos} inativo{inativos !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={exportarCsv} style={btnGhost} title="Exportar lista em CSV">⬇ CSV</button>
          <button onClick={() => setModalNovo(true)} style={btnPrimary}>+ Adicionar cliente</button>
        </div>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['todos', 'ativo', 'inativo'] as const).map(s => (
            <button key={s} onClick={() => setFiltroStatus(s)} style={s === filtroStatus ? pillActive : pill}>
              {s === 'todos' ? 'Todos' : STATUS_LABEL[s]}
            </button>
          ))}
        </div>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar por nome, email, telefone ou empresa..."
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
        <div className="dt-wrap">
          <table className="dt">
            <thead>
              <tr>
                <Th label="Nome" k="nome" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Contato</th>
                <Th label="Empresa" k="empresa" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th>Consultorias</th>
                <Th label="Origem" k="origem" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                <th style={{ textAlign: 'right' }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {filtrados.map(c => (
                <tr key={c.id} onClick={() => setPerfilAberto(c)}>
                  <td><span className="dt-name">{c.nome}</span></td>
                  <td>
                    <div className="dt-sub">
                      {c.telefone && <div>📞 {c.telefone}</div>}
                      {c.email && <div>✉ {c.email}</div>}
                      {!c.telefone && !c.email && <span>—</span>}
                    </div>
                  </td>
                  <td className="dt-sub">{c.empresa || '—'}</td>
                  <td><span style={c.status === 'ativo' ? badgeAtivo : badgeInativo}>{STATUS_LABEL[c.status as ClienteStatus]}</span></td>
                  <td>
                    {(c.c1 || c.c2 || c.c3 || c.c4) ? (
                      <div style={{ display: 'flex', gap: 4 }}>
                        {CHECK_LABELS.map((lbl, i) => {
                          const val = [c.c1, c.c2, c.c3, c.c4][i];
                          return val ? <span key={lbl} style={chip}>{lbl}</span> : null;
                        })}
                      </div>
                    ) : <span className="dt-sub">—</span>}
                  </td>
                  <td className="dt-sub">{c.origem || '—'}</td>
                  <td>
                    <div className="dt-actions">
                      <button className="dt-iconbtn" title="Ver perfil" onClick={(e) => { e.stopPropagation(); setPerfilAberto(c); }}>→</button>
                      <button className="dt-iconbtn danger" title="Excluir" onClick={(e) => excluir(c, e)}>✕</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Drawer perfil */}
      {perfilAberto && (
        <PerfilCliente
          cliente={perfilAberto}
          onClose={() => setPerfilAberto(null)}
          onSaved={() => {
            carregar();
            // Atualiza o objeto local para o drawer refletir o nome/status novo
            setPerfilAberto(prev => prev ? { ...prev } : null);
          }}
        />
      )}

      {/* Modal novo cliente */}
      {modalNovo && (
        <ModalNovoCliente
          onClose={() => setModalNovo(false)}
          onSaved={() => { setModalNovo(false); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Modal novo cliente (form simples) ───────────────────────
function ModalNovoCliente({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', empresa: '', origem: '' });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    const { error } = await supabase.from('pessoas').insert({
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      email: form.email || null,
      empresa: form.empresa || null,
      origem: form.origem || null,
      fase: 'cliente',
      status: 'ativo',
      user_id: user.id,
      c1: false, c2: false, c3: false, c4: false,
    });

    if (error) { setErro(error.message); setSaving(false); }
    else { onSaved(); }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16, color: 'var(--text)' }}>Novo cliente</div>

        <Field label="Nome *">
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={inputStyle} placeholder="Nome do cliente" autoFocus />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Telefone" flex>
            <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={inputStyle} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Email" flex>
            <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={inputStyle} placeholder="email@exemplo.com" />
          </Field>
        </div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Empresa" flex>
            <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} style={inputStyle} placeholder="Empresa" />
          </Field>
          <Field label="Origem" flex>
            <input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={inputStyle} placeholder="Indicação, evento..." />
          </Field>
        </div>

        {erro && <div style={errorBox}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Criar cliente'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onSort }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="sortable" onClick={() => onSort(k)}>
      {label}
      <span className={`arrow${active ? ' active' : ''}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
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
const inputStyle: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const pill: React.CSSProperties = { padding: '6px 12px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' };
const pillActive: React.CSSProperties = { ...pill, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const badgeAtivo: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(34,160,90,.15)', color: '#1a8a4a' };
const badgeInativo: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(120,120,120,.15)', color: 'var(--muted)' };
const chip: React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 6, background: 'rgba(245,158,11,.15)', color: '#F59E0B' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 460, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' };
