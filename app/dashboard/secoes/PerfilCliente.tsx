'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ClienteStatus } from '@/lib/types';
import { TIPOS_REUNIAO, TIPO_REUNIAO_LABEL, type TipoReuniao } from '@/lib/prompts-relatorio';

// ─── Tipos ───────────────────────────────────────────────────
interface ReuniaoRow {
  id: string;
  tipo: string;
  data_reuniao: string | null;
  transcricao: string | null;
  relatorio: string | null;
  relatorio_gerado_em: string | null;
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

type Aba = 'info' | 'atividades' | 'reunioes' | 'proximos';

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
          {aba === 'info'       && <AbaInfo cliente={cliente} onSaved={onSaved} />}
          {aba === 'atividades' && <AbaAtividades pessoaId={cliente.id} />}
          {aba === 'reunioes'   && <AbaReunioes pessoaId={cliente.id} userId={cliente.user_id} />}
          {aba === 'proximos'   && <AbaProximos pessoaId={cliente.id} />}
        </div>
      </div>
    </>
  );
}

// ─── Aba Info ─────────────────────────────────────────────────
function AbaInfo({ cliente, onSaved }: { cliente: Pessoa; onSaved: () => void }) {
  const [form, setForm] = useState({
    nome: cliente.nome,
    telefone: cliente.telefone || '',
    email: cliente.email || '',
    empresa: cliente.empresa || '',
    status: (cliente.status === 'inativo' ? 'inativo' : 'ativo') as ClienteStatus,
    origem: cliente.origem || '',
    notas: cliente.notas || '',
    data_inicio: cliente.data_inicio || '',
    c1: cliente.c1,
    c2: cliente.c2,
    c3: cliente.c3,
    c4: cliente.c4,
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
        c1: form.c1, c2: form.c2, c3: form.c3, c4: form.c4,
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

      <Field label="Notas">
        <textarea value={form.notas} onChange={e => setForm({ ...form, notas: e.target.value })} rows={4} style={{ ...input, resize: 'vertical', fontFamily: 'inherit' }} placeholder="Observações sobre o cliente..." />
      </Field>

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
      .select('id, tipo, data_reuniao, transcricao, relatorio, relatorio_gerado_em, created_at')
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
  const [saving, setSaving] = useState(false);
  const [gerando, setGerando] = useState(false);
  const [erro, setErro] = useState('');

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

    const payload = {
      tipo,
      data_reuniao: dataReuniao || null,
      transcricao: transcricao || null,
      relatorio: relatorio || null,
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

    if (error) { setErro(error.message); setSaving(false); }
    else { onSaved(); }
  };

  return (
    <div>
      <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 16 }}>
        {reuniao ? 'Editar reunião' : 'Nova reunião'}
      </div>

      <div style={{ display: 'flex', gap: 10, marginBottom: 12 }}>
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

      {erro && <div style={errorBox}>{erro}</div>}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
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
