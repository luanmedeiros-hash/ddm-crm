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

// ─── Modal novo cliente (com jornada em andamento) ────────────
const ETAPAS_JORNADA = [
  { tipo: 'analise',        label: 'Análise',            cx: null  },
  { tipo: 'c1',             label: 'C1 · Organização',   cx: 'c1' as const },
  { tipo: 'c2',             label: 'C2 · Seguro',        cx: 'c2' as const },
  { tipo: 'c3',             label: 'C3 · Previdência',   cx: 'c3' as const },
  { tipo: 'c4',             label: 'C4 · Consórcio',     cx: 'c4' as const },
  { tipo: 'acompanhamento', label: 'Acompanhamento',     cx: null  },
] as const;

// Próxima etapa da jornada (cadência +10 dias) — espelha PROXIMA_ETAPA do PerfilCliente
const PROXIMA_DEPOIS: Record<string, { label: string; dias: number } | undefined> = {
  analise: { label: 'C1 — Organização Financeira', dias: 10 },
  c1:      { label: 'C2 — Seguro',                  dias: 10 },
  c2:      { label: 'C3 — Previdência',             dias: 10 },
  c3:      { label: 'C4 — Consórcio',               dias: 10 },
  c4:      { label: 'Acompanhamento',               dias: 10 },
};

function addDiasIso(iso: string, dias: number): string {
  const d = new Date(iso + 'T12:00:00');
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

interface EtapaForm { feito: boolean; data: string }

function ModalNovoCliente({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ nome: '', telefone: '', email: '', empresa: '', origem: '' });
  const [dataFechamento, setDataFechamento] = useState('');
  const [etapas, setEtapas] = useState<Record<string, EtapaForm>>(
    Object.fromEntries(ETAPAS_JORNADA.map(e => [e.tipo, { feito: false, data: '' }]))
  );
  const [fin, setFin] = useState({ patrimonio: '', renda_mensal: '', perfil_risco: '', objetivo: '' });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const setEtapa = (tipo: string, patch: Partial<EtapaForm>) =>
    setEtapas(prev => ({ ...prev, [tipo]: { ...prev[tipo], ...patch } }));

  const parseMoeda = (v: string): number | null => {
    const n = Number(String(v).replace(/[^\d]/g, ''));
    return n > 0 ? n : null;
  };

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }

    // Etapas marcadas como feitas precisam de data
    const feitas = ETAPAS_JORNADA.filter(e => etapas[e.tipo].feito);
    const semData = feitas.find(e => !etapas[e.tipo].data);
    if (semData) { setErro(`Informe a data da etapa "${semData.label}".`); return; }

    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    // Flags C1–C4 a partir das etapas feitas
    const cx = { c1: etapas.c1.feito, c2: etapas.c2.feito, c3: etapas.c3.feito, c4: etapas.c4.feito };
    // Data de início: data da Análise, senão fechamento, senão hoje
    const dataInicio = etapas.analise.data || dataFechamento || new Date().toISOString().slice(0, 10);

    // 1) Cria o cliente
    const { data: nova, error } = await supabase.from('pessoas').insert({
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      email: form.email || null,
      empresa: form.empresa || null,
      origem: form.origem || null,
      fase: 'cliente',
      status: 'ativo',
      user_id: user.id,
      data_inicio: dataInicio,
      data_fechamento: dataFechamento || null,
      patrimonio: parseMoeda(fin.patrimonio),
      renda_mensal: parseMoeda(fin.renda_mensal),
      perfil_risco: fin.perfil_risco || null,
      objetivo: fin.objetivo || null,
      ...cx,
    }).select('id').single();

    if (error || !nova) { setErro(error?.message || 'Erro ao criar cliente.'); setSaving(false); return; }
    const pessoaId = (nova as { id: string }).id;

    // 2) Registra as reuniões já realizadas (alimenta a Jornada)
    if (feitas.length > 0) {
      const rows = feitas.map(e => ({
        pessoa_id: pessoaId,
        user_id: user.id,
        tipo: e.tipo,
        data_reuniao: etapas[e.tipo].data,
      }));
      const { error: errReun } = await supabase.from('reunioes').insert(rows);
      if (errReun) { setErro('Cliente criado, mas houve erro ao registrar as reuniões: ' + errReun.message); setSaving(false); return; }

      // 3) Cadência: cria o próximo passo após a última etapa feita
      const ordem = ETAPAS_JORNADA.map(e => e.tipo);
      const ultima = [...feitas].sort((a, b) => ordem.indexOf(a.tipo) - ordem.indexOf(b.tipo)).pop()!;
      const prox = PROXIMA_DEPOIS[ultima.tipo];
      if (prox && etapas[ultima.tipo].data) {
        await supabase.from('proximos_passos').insert({
          pessoa_id: pessoaId,
          user_id: user.id,
          descricao: `Agendar ${prox.label}`,
          data_prevista: addDiasIso(etapas[ultima.tipo].data, prox.dias),
        });
      }
    }

    onSaved();
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Novo cliente</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          Marque as consultorias já realizadas para registrar um cliente em andamento.
        </div>

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

        {/* Jornada em andamento */}
        <div style={secaoTitulo}>📍 Jornada — consultorias já realizadas</div>
        <Field label="Data de fechamento (início da jornada)">
          <input type="date" value={dataFechamento} onChange={e => setDataFechamento(e.target.value)} style={inputStyle} />
        </Field>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 12 }}>
          {ETAPAS_JORNADA.map(e => {
            const st = etapas[e.tipo];
            return (
              <div key={e.tipo} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 10px', borderRadius: 9, border: `1px solid ${st.feito ? 'var(--primary-200)' : 'var(--line)'}`, background: st.feito ? 'var(--primary-100)' : 'transparent' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, cursor: 'pointer', fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>
                  <input type="checkbox" checked={st.feito} onChange={ev => setEtapa(e.tipo, { feito: ev.target.checked })} />
                  {e.label}
                </label>
                {st.feito && (
                  <input
                    type="date"
                    value={st.data}
                    onChange={ev => setEtapa(e.tipo, { data: ev.target.value })}
                    style={{ ...inputStyle, width: 150 }}
                  />
                )}
              </div>
            );
          })}
        </div>

        {/* Financeiro (opcional) */}
        <div style={secaoTitulo}>💰 Financeiro (opcional)</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Patrimônio (R$)" flex>
            <input value={fin.patrimonio} onChange={e => setFin({ ...fin, patrimonio: e.target.value })} style={inputStyle} placeholder="500000" inputMode="numeric" />
          </Field>
          <Field label="Renda mensal (R$)" flex>
            <input value={fin.renda_mensal} onChange={e => setFin({ ...fin, renda_mensal: e.target.value })} style={inputStyle} placeholder="20000" inputMode="numeric" />
          </Field>
        </div>
        <Field label="Perfil de risco">
          <div style={{ display: 'flex', gap: 6 }}>
            {[{ v: 'conservador', l: 'Conservador' }, { v: 'moderado', l: 'Moderado' }, { v: 'arrojado', l: 'Arrojado' }].map(p => (
              <button key={p.v} type="button"
                onClick={() => setFin({ ...fin, perfil_risco: fin.perfil_risco === p.v ? '' : p.v })}
                style={{ flex: 1, padding: '8px 4px', borderRadius: 8, cursor: 'pointer', fontSize: 12.5, fontWeight: 600,
                  border: `1px solid ${fin.perfil_risco === p.v ? 'var(--primary)' : 'var(--line)'}`,
                  background: fin.perfil_risco === p.v ? 'var(--primary-100)' : 'transparent',
                  color: fin.perfil_risco === p.v ? 'var(--primary)' : 'var(--muted)' }}>
                {p.l}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Objetivo">
          <input value={fin.objetivo} onChange={e => setFin({ ...fin, objetivo: e.target.value })} style={inputStyle} placeholder="Aposentadoria, proteção familiar..." />
        </Field>

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
const secaoTitulo: React.CSSProperties = { fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: '18px 0 10px', paddingTop: 14, borderTop: '1px solid var(--line)' };
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
