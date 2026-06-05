'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ClienteStatus } from '@/lib/types';
import { TIPOS_REUNIAO, TIPO_REUNIAO_LABEL, PRODUTO_POR_REUNIAO, type TipoReuniao } from '@/lib/prompts-relatorio';
import JornadaCliente from './JornadaCliente';
import AbaAnexos from './AbaAnexos';

// ─── Tipos ───────────────────────────────────────────────────
interface ReuniaoRow {
  id: string;
  tipo: string;
  data_reuniao: string | null;
  transcricao: string | null;
  relatorio: string | null;
  relatorio_gerado_em: string | null;
  contrato_gerado: boolean;
  apolice_path: string | null;
  apolice_nome: string | null;
  created_at: string;
}

interface ProximoPasso {
  id: string;
  descricao: string;
  data_prevista: string | null;
  feito: boolean;
  feito_em: string | null;
  created_at: string;
}

interface Atividade {
  id: string;
  tipo: string;
  descricao: string;
  data_atividade: string;
  created_at: string;
}

const TIPO_ATIV_LABEL: Record<string, { emoji: string; label: string; cor: string }> = {
  ligacao:  { emoji: '📞', label: 'Ligação',   cor: '#6366f1' },
  whatsapp: { emoji: '💬', label: 'WhatsApp',  cor: '#22c55e' },
  email:    { emoji: '✉️', label: 'Email',     cor: '#F59E0B' },
  reuniao:  { emoji: '🤝', label: 'Reunião',   cor: '#4a90c8' },
  anotacao: { emoji: '📝', label: 'Anotação',  cor: '#9ca3af' },
  visita:   { emoji: '🏠', label: 'Visita',    cor: '#a855f7' },
};

type Aba = 'info' | 'atividades' | 'reunioes' | 'proximos' | 'anexos';

const CHECK_LABELS = ['C1', 'C2', 'C3', 'C4'] as const;

function fmtData(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

// ─── Componente principal ─────────────────────────────────────
export default function PerfilCliente({
  cliente,
  onClose,
  onSaved,
}: {
  cliente: Pessoa;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [aba, setAba] = useState<Aba>('info');

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <>
      {/* Overlay */}
      <div onClick={onClose} style={overlayStyle} />

      {/* Drawer */}
      <div style={drawerStyle}>
        {/* Header */}
        <div style={{ padding: '20px 24px 0', borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
              <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{cliente.nome}</div>
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                {cliente.telefone && <span>📞 {cliente.telefone}</span>}
                {cliente.email && <span>✉ {cliente.email}</span>}
                {cliente.empresa && <span>🏢 {cliente.empresa}</span>}
              </div>
            </div>
            <button onClick={onClose} style={btnClose}>✕</button>
          </div>

          {/* Abas */}
          <div style={{ display: 'flex', gap: 2 }}>
            {([
              { key: 'info',       label: 'Info' },
              { key: 'atividades', label: 'Atividades' },
              { key: 'reunioes',   label: 'Reuniões' },
              { key: 'proximos',   label: 'Próximos Passos' },
              { key: 'anexos',     label: 'Anexos' },
            ] as { key: Aba; label: string }[]).map(a => (
              <button
                key={a.key}
                onClick={() => setAba(a.key)}
                style={aba === a.key ? abaActive : abaInactive}
              >
                {a.label}
              </button>
            ))}
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>
          {/* Jornada sempre visível no topo */}
          <JornadaCliente
            pessoaId={cliente.id}
            dataFechamento={(cliente as Pessoa & { data_fechamento?: string }).data_fechamento || cliente.data_inicio || null}
          />

          {aba === 'info'       && <AbaInfo cliente={cliente} onSaved={onSaved} />}
          {aba === 'atividades' && <AbaAtividades pessoaId={cliente.id} />}
          {aba === 'reunioes'   && <AbaReunioes pessoaId={cliente.id} userId={cliente.user_id} />}
          {aba === 'proximos'   && <AbaProximos pessoaId={cliente.id} />}
          {aba === 'anexos'     && <AbaAnexos pessoaId={cliente.id} />}
        </div>
      </div>
    </>
  );
}

const PRODUTOS_OPCOES = ['Previdência', 'Seguro de Vida', 'Seguro Patrimonial', 'Investimento', 'Consórcio', 'Câmbio', 'Crédito'];
const PERFIL_RISCO_OPCOES = [
  { value: 'conservador', label: '🛡️ Conservador' },
  { value: 'moderado',    label: '⚖️ Moderado' },
  { value: 'arrojado',    label: '📈 Arrojado' },
  { value: 'agressivo',   label: '🚀 Agressivo' },
];

function fmtMoeda(v: number | null | undefined) {
  if (!v) return '';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
}

function parseMoeda(s: string): number | null {
  const n = parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.'));
  return isNaN(n) ? null : n;
}

// ─── Aba Info ─────────────────────────────────────────────────
function AbaInfo({ cliente, onSaved }: { cliente: Pessoa; onSaved: () => void }) {
  const ext = cliente as Pessoa & { patrimonio?: number; renda_mensal?: number; perfil_risco?: string; produtos?: string[]; objetivo?: string };
  const [form, setForm] = useState({
    nome: cliente.nome,
    telefone: cliente.telefone || '',
    email: cliente.email || '',
    empresa: cliente.empresa || '',
    status: (cliente.status === 'inativo' ? 'inativo' : 'ativo') as ClienteStatus,
    origem: cliente.origem || '',
    notas: cliente.notas || '',
    data_inicio: cliente.data_inicio || '',
    data_fechamento: (cliente as Pessoa & { data_fechamento?: string }).data_fechamento || '',
    winner_contact_id: (cliente as Pessoa & { winner_contact_id?: string }).winner_contact_id || '',
    c1: cliente.c1,
    c2: cliente.c2,
    c3: cliente.c3,
    c4: cliente.c4,
    // Campos financeiros
    patrimonio: ext.patrimonio ? String(ext.patrimonio) : '',
    renda_mensal: ext.renda_mensal ? String(ext.renda_mensal) : '',
    perfil_risco: ext.perfil_risco || '',
    produtos: ext.produtos || [] as string[],
    objetivo: ext.objetivo || '',
  });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [salvo, setSalvo] = useState(false);

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true); setErro('');
    const { error } = await supabase
      .from('pessoas')
      .update({
        nome: form.nome.trim(),
        telefone: form.telefone || null,
        email: form.email || null,
        empresa: form.empresa || null,
        status: form.status,
        origem: form.origem || null,
        notas: form.notas || null,
        data_inicio: form.data_inicio || null,
        data_fechamento: (form as typeof form & { data_fechamento?: string }).data_fechamento || null,
        winner_contact_id: (form as typeof form & { winner_contact_id?: string }).winner_contact_id || null,
        c1: form.c1, c2: form.c2, c3: form.c3, c4: form.c4,
        patrimonio: parseMoeda(form.patrimonio),
        renda_mensal: parseMoeda(form.renda_mensal),
        perfil_risco: form.perfil_risco || null,
        produtos: form.produtos,
        objetivo: form.objetivo || null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', cliente.id);
    if (error) { setErro(error.message); }
    else { setSalvo(true); setTimeout(() => setSalvo(false), 2000); onSaved(); }
    setSaving(false);
  };

  return (
    <div>
      <Field label="Nome *">
        <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={input} />
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Telefone" flex>
          <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={input} placeholder="(00) 00000-0000" />
        </Field>
        <Field label="Status" flex>
          <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ClienteStatus })} style={input}>
            <option value="ativo">Ativo</option>
            <option value="inativo">Inativo</option>
          </select>
        </Field>
      </div>

      <Field label="Email">
        <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} style={input} placeholder="email@exemplo.com" />
      </Field>

      <Field label="Empresa">
        <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} style={input} placeholder="Nome da empresa" />
      </Field>

      <div style={{ display: 'flex', gap: 10 }}>
        <Field label="Origem" flex>
          <input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={input} placeholder="Indicação, evento..." />
        </Field>
        <Field label="Data de início" flex>
          <input type="date" value={form.data_inicio} onChange={e => setForm({ ...form, data_inicio: e.target.value })} style={input} />
        </Field>
      </div>

      <Field label="Data de fechamento (quando virou cliente)">
        <input
          type="date"
          value={(form as typeof form & { data_fechamento?: string }).data_fechamento || ''}
          onChange={e => setForm({ ...form, ...{ data_fechamento: e.target.value } })}
          style={input}
        />
      </Field>

      <Field label="ID do contato no W1nner">
        <input
          value={(form as typeof form & { winner_contact_id?: string }).winner_contact_id || ''}
          onChange={e => setForm({ ...form, ...{ winner_contact_id: e.target.value } })}
          style={input}
          placeholder="Ex: 1422308 (número do contato no W1nner)"
        />
      </Field>

      <Field label="Notas">
        <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={4} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Observações sobre o cliente..." />
      </Field>

      {/* ── Perfil financeiro ── */}
      <div style={{ margin: '4px 0 14px', paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12 }}>
          💰 Perfil financeiro
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Patrimônio" flex>
            <input
              value={form.patrimonio}
              onChange={e => setForm({ ...form, patrimonio: e.target.value })}
              style={input}
              placeholder="Ex: 500000"
              type="number"
              min="0"
            />
          </Field>
          <Field label="Renda mensal" flex>
            <input
              value={form.renda_mensal}
              onChange={e => setForm({ ...form, renda_mensal: e.target.value })}
              style={input}
              placeholder="Ex: 15000"
              type="number"
              min="0"
            />
          </Field>
        </div>

        <Field label="Perfil de risco">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PERFIL_RISCO_OPCOES.map(p => (
              <button
                key={p.value}
                type="button"
                onClick={() => setForm({ ...form, perfil_risco: form.perfil_risco === p.value ? '' : p.value })}
                style={{
                  padding: '6px 12px', borderRadius: 20, fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${form.perfil_risco === p.value ? 'var(--primary)' : 'var(--line)'}`,
                  background: form.perfil_risco === p.value ? 'rgba(74,144,200,.12)' : 'transparent',
                  color: form.perfil_risco === p.value ? 'var(--primary)' : 'var(--muted)',
                }}
              >
                {p.label}
              </button>
            ))}
          </div>
        </Field>

        <Field label="Produtos contratados / interesse">
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {PRODUTOS_OPCOES.map(p => {
              const ativo = form.produtos.includes(p);
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setForm({ ...form, produtos: ativo ? form.produtos.filter(x => x !== p) : [...form.produtos, p] })}
                  style={{
                    padding: '5px 11px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                    border: `1px solid ${ativo ? '#F59E0B' : 'var(--line)'}`,
                    background: ativo ? 'rgba(245,158,11,.12)' : 'transparent',
                    color: ativo ? '#F59E0B' : 'var(--muted)',
                  }}
                >
                  {p}
                </button>
              );
            })}
          </div>
        </Field>

        <Field label="Objetivo financeiro">
          <input
            value={form.objetivo}
            onChange={e => setForm({ ...form, objetivo: e.target.value })}
            style={input}
            placeholder="Ex: Aposentadoria, proteção familiar, crescimento patrimonial..."
          />
        </Field>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={labelStyle}>Marcadores</div>
        <div style={{ display: 'flex', gap: 14, marginTop: 8, flexWrap: 'wrap' }}>
          {CHECK_LABELS.map((lbl, i) => {
            const key = (['c1', 'c2', 'c3', 'c4'] as const)[i];
            return (
              <label key={lbl} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text)', cursor: 'pointer' }}>
                <input type="checkbox" checked={form[key]} onChange={e => setForm({ ...form, [key]: e.target.checked })} />
                {lbl}
              </label>
            );
          })}
        </div>
      </div>

      {erro && <div style={errorBox}>{erro}</div>}
      {salvo && <div style={successBox}>✓ Salvo com sucesso</div>}

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : 'Salvar alterações'}
        </button>
      </div>
    </div>
  );
}

// ─── Aba Atividades ───────────────────────────────────────────
function AbaAtividades({ pessoaId }: { pessoaId: string }) {
  const [atividades, setAtividades] = useState<Atividade[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ tipo: string; descricao: string; data_atividade: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('atividades')
      .select('id, tipo, descricao, data_atividade, created_at')
      .eq('pessoa_id', pessoaId)
      .order('data_atividade', { ascending: false });
    setAtividades((data as Atividade[]) || []);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async () => {
    if (!form?.descricao.trim()) { setErro('Descrição é obrigatória.'); return; }
    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    const { error } = await supabase.from('atividades').insert({
      pessoa_id: pessoaId,
      user_id: user.id,
      tipo: form.tipo,
      descricao: form.descricao.trim(),
      data_atividade: form.data_atividade || new Date().toISOString(),
    });

    if (error) { setErro(error.message); }
    else { setForm(null); carregar(); }
    setSaving(false);
  };

  const excluir = async (id: string) => {
    await supabase.from('atividades').delete().eq('id', id);
    carregar();
  };

  // Agrupar por dia
  const grupos: { data: string; itens: Atividade[] }[] = [];
  for (const a of atividades) {
    const dia = a.data_atividade.slice(0, 10);
    const g = grupos.find(g => g.data === dia);
    if (g) g.itens.push(a);
    else grupos.push({ data: dia, itens: [a] });
  }

  function fmtDia(iso: string) {
    const d = new Date(iso + 'T12:00:00');
    const hoje = new Date();
    const ontem = new Date(hoje); ontem.setDate(hoje.getDate() - 1);
    if (d.toDateString() === hoje.toDateString()) return 'Hoje';
    if (d.toDateString() === ontem.toDateString()) return 'Ontem';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long' });
  }

  const novaAtivForm = { tipo: 'ligacao', descricao: '', data_atividade: new Date().toISOString().slice(0, 16) };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{atividades.length} atividade{atividades.length !== 1 ? 's' : ''}</div>
        {!form && (
          <button onClick={() => setForm(novaAtivForm)} style={btnPrimary}>+ Registrar</button>
        )}
      </div>

      {/* Formulário */}
      {form && (
        <div style={{ ...cardReuniao, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Nova atividade</div>

          {/* Seletor de tipo */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 12 }}>
            {Object.entries(TIPO_ATIV_LABEL).map(([key, val]) => (
              <button
                key={key}
                onClick={() => setForm({ ...form, tipo: key })}
                style={{
                  padding: '5px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  border: `1px solid ${form.tipo === key ? val.cor : 'var(--line)'}`,
                  background: form.tipo === key ? val.cor + '18' : 'transparent',
                  color: form.tipo === key ? val.cor : 'var(--muted)',
                }}
              >
                {val.emoji} {val.label}
              </button>
            ))}
          </div>

          <Field label="Descrição *">
            <textarea
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              rows={3}
              style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }}
              placeholder="O que aconteceu? Ex: Liguei para apresentar a proposta..."
              autoFocus
            />
          </Field>

          <Field label="Data e hora">
            <input
              type="datetime-local"
              value={form.data_atividade}
              onChange={e => setForm({ ...form, data_atividade: e.target.value })}
              style={input}
            />
          </Field>

          {erro && <div style={errorBox}>{erro}</div>}

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setForm(null); setErro(''); }} style={btnGhost}>Cancelar</button>
            <button onClick={adicionar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Salvar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : atividades.length === 0 && !form ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nenhuma atividade registrada.<br />
          <span style={{ fontSize: 12 }}>Registre ligações, mensagens e visitas.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {grupos.map(g => (
            <div key={g.data}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                {fmtDia(g.data)}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {g.itens.map(a => {
                  const meta = TIPO_ATIV_LABEL[a.tipo] || { emoji: '📌', label: a.tipo, cor: 'var(--muted)' };
                  return (
                    <div key={a.id} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                      {/* Linha do tempo */}
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', paddingTop: 2 }}>
                        <div style={{ width: 28, height: 28, borderRadius: 999, background: meta.cor + '18', border: `1.5px solid ${meta.cor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, flexShrink: 0 }}>
                          {meta.emoji}
                        </div>
                      </div>
                      <div style={{ flex: 1, ...cardReuniao, padding: '8px 12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                          <span style={{ fontSize: 11, fontWeight: 700, color: meta.cor }}>{meta.label}</span>
                          <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                            {new Date(a.data_atividade).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                          <span style={{ flex: 1 }} />
                          <button onClick={() => excluir(a.id)} style={{ border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 12 }}>✕</button>
                        </div>
                        <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{a.descricao}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Aba Reuniões ─────────────────────────────────────────────
function AbaReunioes({ pessoaId, userId }: { pessoaId: string; userId: string }) {
  const [reunioes, setReunioes] = useState<ReuniaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandido, setExpandido] = useState<string | null>(null);
  const [novaForm, setNovaForm] = useState(false);
  const [editando, setEditando] = useState<ReuniaoRow | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reunioes')
      .select('id, tipo, data_reuniao, transcricao, relatorio, relatorio_gerado_em, contrato_gerado, apolice_path, apolice_nome, created_at')
      .eq('pessoa_id', pessoaId)
      .order('data_reuniao', { ascending: false, nullsFirst: false });
    setReunioes((data as ReuniaoRow[]) || []);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const excluir = async (id: string) => {
    if (!confirm('Excluir esta reunião?')) return;
    await supabase.from('reunioes').delete().eq('id', id);
    carregar();
  };

  if (editando || novaForm) {
    return (
      <FormReuniao
        pessoaId={pessoaId}
        userId={userId}
        reuniao={editando}
        onSaved={() => { setEditando(null); setNovaForm(false); carregar(); }}
        onCancel={() => { setEditando(null); setNovaForm(false); }}
      />
    );
  }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>{reunioes.length} reunião{reunioes.length !== 1 ? 'ões' : ''} registrada{reunioes.length !== 1 ? 's' : ''}</div>
        <button onClick={() => setNovaForm(true)} style={btnPrimary}>+ Nova reunião</button>
      </div>

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : reunioes.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nenhuma reunião registrada ainda.<br />
          <span style={{ fontSize: 12 }}>Clique em "+ Nova reunião" para começar.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {reunioes.map(r => {
            const exp = expandido === r.id;
            return (
              <div key={r.id} style={cardReuniao}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={tipoChip}>{TIPO_REUNIAO_LABEL[r.tipo as TipoReuniao] || r.tipo}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text)', flex: 1 }}>{fmtData(r.data_reuniao)}</span>
                  {r.contrato_gerado && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>✅ Contrato</span>}
                  {r.apolice_nome && <span style={{ fontSize: 11, color: '#4a90c8', fontWeight: 600 }}>📎 Apólice</span>}
                  {r.relatorio && <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>📄 Relatório</span>}
                  {r.transcricao && !r.relatorio && <span style={{ fontSize: 11, color: '#F59E0B', fontWeight: 600 }}>📝 Transcrição</span>}
                  <button onClick={() => setEditando(r)} style={btnIcon} title="Editar">✏️</button>
                  <button
                    onClick={() => setExpandido(exp ? null : r.id)}
                    style={btnIcon}
                    title={exp ? 'Recolher' : 'Expandir'}
                  >
                    {exp ? '▲' : '▼'}
                  </button>
                  <button onClick={() => excluir(r.id)} style={btnIcon} title="Excluir">✕</button>
                </div>

                {exp && (
                  <div style={{ marginTop: 12 }}>
                    {r.relatorio && (
                      <div style={{ marginBottom: r.transcricao ? 12 : 0 }}>
                        <div style={{ ...labelStyle, marginBottom: 6 }}>Relatório</div>
                        <div style={textBox}>{r.relatorio}</div>
                      </div>
                    )}
                    {r.transcricao && (
                      <div>
                        <div style={{ ...labelStyle, marginBottom: 6 }}>Transcrição</div>
                        <div style={textBox}>{r.transcricao}</div>
                      </div>
                    )}
                    {!r.relatorio && !r.transcricao && (
                      <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>Sem conteúdo registrado.</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Formulário de reunião (nova ou editar) ───────────────────
function FormReuniao({
  pessoaId,
  userId,
  reuniao,
  onSaved,
  onCancel,
}: {
  pessoaId: string;
  userId: string;
  reuniao: ReuniaoRow | null;
  onSaved: () => void;
  onCancel: () => void;
}) {
  const [tipo, setTipo] = useState<TipoReuniao>((reuniao?.tipo as TipoReuniao) || 'analise');
  const [dataReuniao, setDataReuniao] = useState(
    reuniao?.data_reuniao ? reuniao.data_reuniao.slice(0, 10) : new Date().toISOString().slice(0, 10)
  );
  const [transcricao, setTranscricao] = useState(reuniao?.transcricao || '');
  const [relatorio, setRelatorio] = useState(reuniao?.relatorio || '');
  const [contratoGerado, setContratoGerado] = useState(reuniao?.contrato_gerado || false);
  const [apoliceFile, setApoliceFile] = useState<File | null>(null);
  const [apoliceNome, setApoliceNome] = useState(reuniao?.apolice_nome || '');
  const [uploadandoApolice, setUploadandoApolice] = useState(false);
  const [horaInicio, setHoraInicio] = useState('10:00');
  const [horaFim, setHoraFim] = useState('11:00');
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [lanandoWinner, setLanandoWinner] = useState(false);
  const [criandoCalendar, setCriandoCalendar] = useState(false);
  const [msgWinner, setMsgWinner] = useState<{ ok: boolean; texto: string } | null>(null);
  const [msgCalendar, setMsgCalendar] = useState<{ ok: boolean; texto: string } | null>(null);
  const [erro, setErro] = useState('');
  const apoliceInputRef = React.useRef<HTMLInputElement>(null);

  const temProduto = ['c2', 'c3', 'c4'].includes(tipo);
  const produtoLabel = PRODUTO_POR_REUNIAO[tipo as TipoReuniao];

  const lancarWinner = async (winnerContactId?: string) => {
    setLanandoWinner(true); setMsgWinner(null);
    try {
      const dataFim = dataReuniao; // mesmo dia
      const res = await fetch('/api/winner/agendar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tipo, dataInicio: dataReuniao, horaInicio, dataFim, horaFim,
          winnerContactId: winnerContactId || undefined,
          descricao: transcricao ? transcricao.slice(0, 200) : undefined,
        }),
      });
      const json = await res.json();
      if (json.ok) { setMsgWinner({ ok: true, texto: `✅ Lançado no W1nner${json.eventId ? ` (ID: ${json.eventId})` : ''}` }); }
      else { setMsgWinner({ ok: false, texto: json.message || json.error || 'Erro ao lançar no W1nner.' }); }
    } catch { setMsgWinner({ ok: false, texto: 'Erro de conexão.' }); }
    setLanandoWinner(false);
  };

  const criarCalendar = async (clienteEmail?: string, clienteNome?: string) => {
    setCriandoCalendar(true); setMsgCalendar(null);
    try {
      const startIso = `${dataReuniao}T${horaInicio}:00-03:00`;
      const endIso   = `${dataReuniao}T${horaFim}:00-03:00`;
      const res = await fetch('/api/calendar/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          summary: `${tipo.toUpperCase()} — ${clienteNome || 'Cliente'}`,
          description: transcricao || undefined,
          startIso, endIso,
          attendeeEmails: clienteEmail ? [clienteEmail] : [],
        }),
      });
      const json = await res.json();
      if (json.ok) { setMsgCalendar({ ok: true, texto: '📅 Evento criado no Google Calendar!' }); }
      else { setMsgCalendar({ ok: false, texto: json.message || json.error || 'Erro ao criar no Calendar.' }); }
    } catch { setMsgCalendar({ ok: false, texto: 'Erro de conexão.' }); }
    setCriandoCalendar(false);
  };

  const gerarRelatorio = async () => {
    if (transcricao.trim().length < 50) { setErro('Cole a transcrição completa antes de gerar.'); return; }
    setGerando(true); setErro('');
    try {
      const res = await fetch('/api/relatorio-manual', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          pessoaId,
          reuniaoId: reuniao?.id,
          tipo,
          transcricao,
          dataReuniao,
        }),
      });
      const json = await res.json();
      if (!json.ok) { setErro(json.message || json.error || 'Erro ao gerar relatório.'); }
      else { setRelatorio(json.relatorio); }
    } catch {
      setErro('Erro de conexão ao gerar relatório.');
    }
    setGerando(false);
  };

  const salvar = async () => {
    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    // Upload da apólice se houver arquivo novo
    let apolicePath = reuniao?.apolice_path || null;
    let apoliceNomeFinal = reuniao?.apolice_nome || null;
    if (apoliceFile) {
      setUploadandoApolice(true);
      const ext = apoliceFile.name.split('.').pop() || 'pdf';
      const path = `${user.id}/${pessoaId}/apolice-${tipo}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from('anexos')
        .upload(path, apoliceFile, { contentType: apoliceFile.type, upsert: true });
      if (upErr) { setErro('Erro ao enviar apólice: ' + upErr.message); setSaving(false); setUploadandoApolice(false); return; }
      apolicePath = path;
      apoliceNomeFinal = apoliceFile.name;
      setUploadandoApolice(false);
    }

    const payload = {
      tipo,
      data_reuniao: dataReuniao || null,
      transcricao: transcricao || null,
      relatorio: relatorio || null,
      contrato_gerado: contratoGerado,
      apolice_path: apolicePath,
      apolice_nome: apoliceNomeFinal,
      updated_at: new Date().toISOString(),
    };

    let error;
    if (reuniao?.id) {
      ({ error } = await supabase.from('reunioes').update(payload).eq('id', reuniao.id));
    } else {
      ({ error } = await supabase.from('reunioes').insert({
        ...payload,
        pessoa_id: pessoaId,
        user_id: user.id,
      }));
    }

    if (error) { setErro(error.message); setSaving(false); return; }

    // Marca produto no perfil financeiro SOMENTE se contrato foi gerado
    if (contratoGerado && produtoLabel) {
      const { data: p } = await supabase.from('pessoas').select('produtos').eq('id', pessoaId).single();
      const atuais: string[] = (p as { produtos?: string[] })?.produtos || [];
      if (!atuais.includes(produtoLabel)) {
        await supabase.from('pessoas').update({ produtos: [...atuais, produtoLabel] }).eq('id', pessoaId);
      }
    }

    onSaved();
  };

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
        {reuniao ? 'Editar reunião' : 'Nova reunião'}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Field label="Tipo" flex>
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoReuniao)} style={input}>
            {TIPOS_REUNIAO.map(t => (
              <option key={t} value={t}>{TIPO_REUNIAO_LABEL[t]}</option>
            ))}
          </select>
        </Field>
        <Field label="Data" flex>
          <input type="date" value={dataReuniao} onChange={e => setDataReuniao(e.target.value)} style={input} />
        </Field>
        <Field label="Início">
          <input type="time" value={horaInicio} onChange={e => setHoraInicio(e.target.value)} style={{ ...input, width: 90 }} />
        </Field>
        <Field label="Fim">
          <input type="time" value={horaFim} onChange={e => setHoraFim(e.target.value)} style={{ ...input, width: 90 }} />
        </Field>
      </div>

      <Field label="Transcrição">
        <textarea
          value={transcricao}
          onChange={e => setTranscricao(e.target.value)}
          rows={8}
          style={{ ...input, resize: 'vertical', fontFamily: 'inherit', fontSize: 12.5 }}
          placeholder="Cole aqui a transcrição da reunião..."
        />
      </Field>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <button
          onClick={gerarRelatorio}
          disabled={gerando || transcricao.trim().length < 50}
          style={{ ...btnSecondary, opacity: gerando || transcricao.trim().length < 50 ? 0.6 : 1 }}
        >
          {gerando ? '⏳ Gerando relatório...' : '✨ Gerar relatório com IA'}
        </button>
      </div>

      {relatorio && (
        <Field label="Relatório gerado">
          <textarea
            value={relatorio}
            onChange={e => setRelatorio(e.target.value)}
            rows={10}
            style={{ ...input, resize: 'vertical', fontFamily: 'monospace', fontSize: 12 }}
          />
        </Field>
      )}

      {/* Flag de contrato — só para C2, C3, C4 */}
      {temProduto && (
        <div style={{
          margin: '4px 0 14px',
          padding: '14px 16px',
          borderRadius: 10,
          background: contratoGerado ? 'rgba(34,197,94,.06)' : 'var(--bg-soft)',
          border: `1px solid ${contratoGerado ? 'rgba(34,197,94,.3)' : 'var(--line)'}`,
          transition: 'all .2s',
        }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={contratoGerado}
              onChange={e => setContratoGerado(e.target.checked)}
              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }}
            />
            <div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: contratoGerado ? '#16a34a' : 'var(--text)' }}>
                {contratoGerado ? '✅ Contrato gerado' : '⬜ Gerou contrato?'}
              </div>
              {produtoLabel && (
                <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                  Produto: {produtoLabel}
                </div>
              )}
            </div>
          </label>

          {/* Upload de apólice */}
          {contratoGerado && (
            <div style={{ marginTop: 12, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8 }}>
                📎 Apólice / Documento
              </div>
              {apoliceNome && !apoliceFile && (
                <div style={{ fontSize: 12.5, color: 'var(--primary)', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span>📄</span> <span>{apoliceNome}</span>
                  <button
                    onClick={async () => {
                      if (!reuniao?.apolice_path) return;
                      const { data } = await supabase.storage.from('anexos').createSignedUrl(reuniao.apolice_path, 60);
                      if (data?.signedUrl) window.open(data.signedUrl, '_blank');
                    }}
                    style={{ fontSize: 11, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}
                  >
                    Abrir
                  </button>
                </div>
              )}
              {apoliceFile && (
                <div style={{ fontSize: 12.5, color: '#22c55e', marginBottom: 8 }}>
                  📄 {apoliceFile.name} — {(apoliceFile.size / 1024).toFixed(0)} KB
                </div>
              )}
              <button
                onClick={() => apoliceInputRef.current?.click()}
                disabled={uploadandoApolice}
                style={{ ...btnGhost, fontSize: 12.5, padding: '6px 12px' }}
              >
                {uploadandoApolice ? 'Enviando...' : apoliceNome || apoliceFile ? '↺ Trocar arquivo' : '⬆ Anexar apólice'}
              </button>
              <input
                ref={apoliceInputRef}
                type="file"
                style={{ display: 'none' }}
                accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                onChange={e => {
                  const f = e.target.files?.[0];
                  if (f) { setApoliceFile(f); setApoliceNome(f.name); }
                }}
              />
            </div>
          )}
        </div>
      )}

      {/* Botões de integração */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 8, paddingTop: 12, borderTop: '1px solid var(--line)' }}>
        <button
          onClick={async () => {
            const { data: p } = await supabase.from('pessoas').select('winner_contact_id, email, nome').eq('id', pessoaId).single();
            lancarWinner((p as { winner_contact_id?: string })?.winner_contact_id || undefined);
          }}
          disabled={lanandoWinner}
          style={{ ...btnGhost, fontSize: 12.5, opacity: lanandoWinner ? 0.6 : 1 }}
          title="Lança o compromisso no W1nner"
        >
          {lanandoWinner ? '⏳ Lançando...' : '🏆 Lançar no W1nner'}
        </button>
        <button
          onClick={async () => {
            const { data: p } = await supabase.from('pessoas').select('email, nome').eq('id', pessoaId).single();
            criarCalendar(p?.email || undefined, p?.nome || undefined);
          }}
          disabled={criandoCalendar}
          style={{ ...btnGhost, fontSize: 12.5, opacity: criandoCalendar ? 0.6 : 1 }}
          title="Cria o evento no Google Calendar"
        >
          {criandoCalendar ? '⏳ Criando...' : '📅 Criar no Google Calendar'}
        </button>
      </div>

      {msgWinner && (
        <div style={{ ...( msgWinner.ok ? successBox : errorBox), marginTop: 8 }}>{msgWinner.texto}</div>
      )}
      {msgCalendar && (
        <div style={{ ...(msgCalendar.ok ? successBox : errorBox), marginTop: 4 }}>{msgCalendar.texto}</div>
      )}

      {erro && <div style={errorBox}>{erro}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
        <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        <button onClick={salvar} disabled={saving || uploadandoApolice} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
          {saving ? 'Salvando...' : 'Salvar reunião'}
        </button>
      </div>
    </div>
  );
}

// ─── Aba Próximos Passos ──────────────────────────────────────
function AbaProximos({ pessoaId }: { pessoaId: string }) {
  const [passos, setPassos] = useState<ProximoPasso[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<{ descricao: string; data_prevista: string } | null>(null);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('proximos_passos')
      .select('id, descricao, data_prevista, feito, feito_em, created_at')
      .eq('pessoa_id', pessoaId)
      .order('feito', { ascending: true })
      .order('data_prevista', { ascending: true, nullsFirst: false });
    setPassos((data as ProximoPasso[]) || []);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const toggleFeito = async (p: ProximoPasso) => {
    const agora = new Date().toISOString();
    await supabase
      .from('proximos_passos')
      .update({
        feito: !p.feito,
        feito_em: !p.feito ? agora : null,
        updated_at: agora,
      })
      .eq('id', p.id);
    carregar();
  };

  const excluir = async (id: string) => {
    await supabase.from('proximos_passos').delete().eq('id', id);
    carregar();
  };

  const adicionar = async () => {
    if (!form?.descricao.trim()) { setErro('Descrição é obrigatória.'); return; }
    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    const { error } = await supabase.from('proximos_passos').insert({
      pessoa_id: pessoaId,
      user_id: user.id,
      descricao: form.descricao.trim(),
      data_prevista: form.data_prevista || null,
    });

    if (error) { setErro(error.message); }
    else { setForm(null); carregar(); }
    setSaving(false);
  };

  const pendentes = passos.filter(p => !p.feito);
  const feitos = passos.filter(p => p.feito);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <div style={{ fontSize: 13, color: 'var(--muted)' }}>
          {pendentes.length} pendente{pendentes.length !== 1 ? 's' : ''} · {feitos.length} concluído{feitos.length !== 1 ? 's' : ''}
        </div>
        {!form && (
          <button onClick={() => setForm({ descricao: '', data_prevista: '' })} style={btnPrimary}>
            + Adicionar
          </button>
        )}
      </div>

      {form && (
        <div style={{ ...cardReuniao, marginBottom: 14 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 10 }}>Novo próximo passo</div>
          <Field label="Descrição">
            <input
              value={form.descricao}
              onChange={e => setForm({ ...form, descricao: e.target.value })}
              style={input}
              placeholder="Ex: Enviar proposta, Ligar na quinta..."
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter') adicionar(); }}
            />
          </Field>
          <Field label="Data prevista">
            <input type="date" value={form.data_prevista} onChange={e => setForm({ ...form, data_prevista: e.target.value })} style={input} />
          </Field>
          {erro && <div style={errorBox}>{erro}</div>}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button onClick={() => { setForm(null); setErro(''); }} style={btnGhost}>Cancelar</button>
            <button onClick={adicionar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : passos.length === 0 && !form ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum próximo passo registrado.<br />
          <span style={{ fontSize: 12 }}>Clique em "+ Adicionar" para começar.</span>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {passos.map(p => (
            <div key={p.id} style={{ ...cardReuniao, opacity: p.feito ? 0.6 : 1 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <button
                  onClick={() => toggleFeito(p)}
                  title={p.feito ? 'Marcar como pendente' : 'Marcar como concluído'}
                  style={{
                    width: 20, height: 20, borderRadius: 4, border: '2px solid var(--primary)',
                    background: p.feito ? 'var(--primary)' : 'transparent',
                    cursor: 'pointer', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  {p.feito && <span style={{ color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</span>}
                </button>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 13.5, color: 'var(--text)',
                    textDecoration: p.feito ? 'line-through' : 'none',
                  }}>
                    {p.descricao}
                  </div>
                  {p.data_prevista && (
                    <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>
                      📅 {fmtData(p.data_prevista)}
                      {p.feito && p.feito_em && ` · concluído em ${fmtData(p.feito_em)}`}
                    </div>
                  )}
                </div>

                <button onClick={() => excluir(p.id)} style={{ ...btnIcon, color: 'var(--muted)' }} title="Excluir">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────
function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ marginBottom: 12, flex: flex ? 1 : undefined }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ marginTop: 5 }}>{children}</div>
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────
const overlayStyle: React.CSSProperties = {
  position: 'fixed', inset: 0, background: 'rgba(0,0,0,.45)', zIndex: 9998,
};
const drawerStyle: React.CSSProperties = {
  position: 'fixed', top: 0, right: 0, bottom: 0, width: '100%', maxWidth: 520,
  background: 'var(--bg-card)', borderLeft: '1px solid var(--line)',
  zIndex: 9999, display: 'flex', flexDirection: 'column',
  boxShadow: '-8px 0 40px rgba(0,0,0,.25)',
};
const btnClose: React.CSSProperties = {
  width: 32, height: 32, borderRadius: 8, border: '1px solid var(--line)',
  background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 14, flexShrink: 0,
};
const abaBase: React.CSSProperties = {
  padding: '8px 14px', border: 'none', background: 'transparent',
  cursor: 'pointer', fontSize: 13, fontWeight: 600, borderBottom: '2px solid transparent',
  marginBottom: -1,
};
const abaActive: React.CSSProperties = {
  ...abaBase, color: 'var(--primary)', borderBottomColor: 'var(--primary)',
};
const abaInactive: React.CSSProperties = {
  ...abaBase, color: 'var(--muted)',
};
const labelStyle: React.CSSProperties = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px',
};
const input: React.CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box',
};
const btnPrimary: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)',
  color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const btnSecondary: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 8, border: '1px solid var(--primary)',
  background: 'transparent', color: 'var(--primary)', fontSize: 13, fontWeight: 700, cursor: 'pointer',
};
const btnGhost: React.CSSProperties = {
  padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)',
  background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer',
};
const btnIcon: React.CSSProperties = {
  width: 28, height: 28, borderRadius: 6, border: 'none',
  background: 'transparent', cursor: 'pointer', fontSize: 13, flexShrink: 0,
};
const cardReuniao: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--line)',
};
const tipoChip: React.CSSProperties = {
  fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999,
  background: 'rgba(74,144,200,.1)', color: 'var(--primary)', flexShrink: 0,
};
const textBox: React.CSSProperties = {
  padding: '12px 14px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--line)',
  color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap',
  fontFamily: 'monospace', maxHeight: 300, overflowY: 'auto',
};
const errorBox: React.CSSProperties = {
  padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)',
  borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12,
};
const successBox: React.CSSProperties = {
  padding: '9px 12px', background: 'rgba(34,197,94,.08)', border: '1px solid rgba(34,197,94,.2)',
  borderRadius: 8, color: '#16a34a', fontSize: 12.5, marginBottom: 12,
};
