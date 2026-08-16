'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CATS, CARGOS, CARGO_NAMES,
  calcContrato, calcAP,
  buildProjection, fmtBRL, fmtPP,
  getParceiras, getProdutos, getDetalhes, findPlano,
  monthKey, type ContratoRow,
} from '@/lib/commission-engine';
import ImportarWinner from './ImportarWinner';

// ─── Tipos ────────────────────────────────────────────────────

type ViewMode = 'projecao' | 'contratos';

type FormState = {
  catId:          string;
  cargo:          string;
  parceira:       string;
  produto:        string;
  detalhe:        string;
  valor:          string;
  data_fechamento: string;
  parcelas:       string;
  // AP fields (simplificados)
  ppsWinner:      string;   // PPs do Winner → calcula valor e ppshist automático
  ppshist:        string;
  prodmes:        string;
  prodeq:         string;
  apParcelas:     string;
};

const FORM_DEFAULT: FormState = {
  catId: 'consorcio', cargo: '', parceira: '', produto: '', detalhe: '',
  valor: '', data_fechamento: new Date().toISOString().split('T')[0],
  parcelas: '12', ppsWinner: '', ppshist: '0', prodmes: '0', prodeq: '0', apParcelas: '1',
};

const MESES_PT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];

function parseBR(s: string): number {
  return parseFloat(s.replace(/\./g, '').replace(',', '.')) || 0;
}

function fmtDateBR(iso: string) {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

function inferPPsHist(cargo: string): number {
  if (cargo.includes('+3000')) return 3000;
  if (cargo.includes('+2000')) return 2000;
  return 0;
}

// ─── Componente principal ──────────────────────────────────────

export default function Comissoes() {
  const [contratos, setContratos]   = useState<ContratoRow[]>([]);
  const [loading, setLoading]       = useState(true);
  const [view, setView]             = useState<ViewMode>('projecao');
  const [showForm, setShowForm]     = useState(false);
  const [showImport, setShowImport] = useState(false);
  const [form, setForm]             = useState<FormState>(FORM_DEFAULT);
  const [saving, setSaving]         = useState(false);
  const [erro, setErro]             = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase.from('contratos_comissao').select('*').order('data_fechamento', { ascending: false });
    setContratos((data ?? []) as ContratoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const projection = useMemo(() => buildProjection(contratos, 18), [contratos]);

  const projectionEntries = useMemo(() => {
    const hoje = new Date();
    return Array.from(projection.entries()).map(([key, val]) => {
      const [y, m] = key.split('-').map(Number);
      return { key, y, m, val, label: `${MESES_PT[m - 1]} ${y}`, isCurrent: y === hoje.getFullYear() && m === hoje.getMonth() + 1 };
    }).sort((a, b) => a.key.localeCompare(b.key));
  }, [projection]);

  const totalPPs   = contratos.reduce((s, c) => s + (c.pps_total ?? 0), 0);
  const totalY1    = contratos.reduce((s, c) => s + (c.comissao_y1 ?? 0), 0);
  const mesAtual   = projection.get(monthKey(new Date())) ?? 0;
  const maxProj    = Math.max(...projectionEntries.map(e => e.val), 1);

  // ── Cálculo live ──────────────────────────────────────────────

  const liveCalc = useMemo(() => {
    const cat = CATS[form.catId];
    if (!cat) return null;
    if (cat.isAP) {
      // Usa ppsWinner se preenchido, senão valor direto
      const ppsNum  = parseBR(form.ppsWinner);
      const valorAP = ppsNum > 0 ? ppsNum * 200 : parseBR(form.valor);
      if (!valorAP) return null;
      const ppshist = inferPPsHist(form.cargo) || parseBR(form.ppshist);
      const prodmes = valorAP; // usa o próprio valor como produção do mês
      const r = calcAP(valorAP, ppshist, prodmes, parseBR(form.prodeq), +form.apParcelas || 1);
      return { pps: r.pps, y1: r.comAP, y2: 0, m1: r.meses[0], isVar: false, fin: r.fin };
    }
    const plano = findPlano(form.catId, form.parceira, form.produto, form.detalhe);
    if (!plano || !form.cargo || !parseBR(form.valor)) return null;
    const r = calcContrato(form.catId, plano, parseBR(form.valor), form.cargo, +form.parcelas || 1);
    return { pps: r.pps, y1: r.y1, y2: r.y2, m1: r.meses[0], isVar: r.isVar, fin: null };
  }, [form]);

  // ── Salvar ────────────────────────────────────────────────────

  async function salvar() {
    setErro('');
    const cat = CATS[form.catId];
    if (!cat) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); return; }
    setSaving(true);

    let payload: Record<string, unknown> = {
      user_id: user.id, cargo: form.cargo,
      categoria_id: form.catId, categoria_label: cat.label,
      parceira: form.parceira || 'AP', produto: form.produto || 'Análise Paga',
      detalhe: form.detalhe || '', data_fechamento: form.data_fechamento, parcelas: +form.parcelas || 1,
    };

    if (cat.isAP) {
      const ppsNum  = parseBR(form.ppsWinner);
      const valorAP = ppsNum > 0 ? ppsNum * 200 : parseBR(form.valor);
      const ppshist = inferPPsHist(form.cargo) || parseBR(form.ppshist);
      const prodmes = valorAP;
      const r = calcAP(valorAP, ppshist, prodmes, parseBR(form.prodeq), +form.apParcelas || 1);
      payload = { ...payload, valor: valorAP, parcelas: +form.apParcelas || 1, pps_total: r.pps, comissao_y1: r.comAP, comissao_y2: 0, comissao_y3: 0, meses_y1: r.meses, meses_y2: Array(12).fill(0), meses_y3: Array(12).fill(0), is_variavel: false };
    } else {
      const plano = findPlano(form.catId, form.parceira, form.produto, form.detalhe);
      if (!plano) { setErro('Selecione produto e detalhe.'); setSaving(false); return; }
      const r = calcContrato(form.catId, plano, parseBR(form.valor), form.cargo, +form.parcelas || 1);
      payload = { ...payload, valor: parseBR(form.valor), pps_total: r.pps, comissao_y1: r.y1, comissao_y2: r.y2, comissao_y3: r.y3, meses_y1: r.meses, meses_y2: r.meses2, meses_y3: r.meses3, is_variavel: r.isVar };
    }

    const { error } = await supabase.from('contratos_comissao').insert(payload);
    if (error) { setErro(error.message); }
    else { setShowForm(false); setForm(FORM_DEFAULT); load(); }
    setSaving(false);
  }

  async function excluir(id: string) {
    if (!confirm('Remover este contrato da projeção?')) return;
    await supabase.from('contratos_comissao').delete().eq('id', id);
    load();
  }

  if (loading) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Comissões</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{contratos.length} contrato{contratos.length !== 1 ? 's' : ''} na carteira</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setShowImport(true)} style={{ ...btnGhost, fontSize: 12.5 }}>📥 Importar do Winner</button>
          <button onClick={() => setShowForm(v => !v)} style={{ ...btnPrimary, fontSize: 12.5 }}>{showForm ? '✕ Fechar' : '+ Registrar contrato'}</button>
        </div>
      </div>

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8 }}>
        <KpiCard label="Mês atual" value={fmtBRL(mesAtual)} sub="comissão esperada" accent />
        <KpiCard label="1º Ano (carteira)" value={fmtBRL(totalY1)} sub="soma de todos contratos" />
        <KpiCard label="Total PPs" value={fmtPP(totalPPs)} sub="acumulado carteira" />
        <KpiCard label="Contratos" value={String(contratos.length)} sub="na projeção" />
      </div>

      {/* Formulário */}
      {showForm && (
        <FormContrato
          form={form} setForm={setForm} liveCalc={liveCalc}
          saving={saving} erro={erro} onSalvar={salvar}
          onCancel={() => { setShowForm(false); setForm(FORM_DEFAULT); setErro(''); }}
        />
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--line)', marginBottom: -4 }}>
        {(['projecao', 'contratos'] as ViewMode[]).map(v => (
          <button key={v} onClick={() => setView(v)} style={{ ...tabBase, color: view === v ? 'var(--primary)' : 'var(--muted)', borderBottom: view === v ? '2px solid var(--primary)' : '2px solid transparent' }}>
            {v === 'projecao' ? '📅 Projeção' : '📋 Contratos'}
          </button>
        ))}
      </div>

      {/* Projeção */}
      {view === 'projecao' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {projectionEntries.length === 0
            ? <EmptyState label="Nenhum contrato registrado. Use '📥 Importar do Winner' para começar." />
            : projectionEntries.map(({ key, val, label, isCurrent }) => {
                const barW = maxProj > 0 ? Math.max((val / maxProj) * 100, val > 0 ? 3 : 0) : 0;
                return (
                  <div key={key} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 8, background: isCurrent ? 'rgba(74,144,200,.06)' : 'var(--bg-soft)', border: `1px solid ${isCurrent ? 'var(--primary)' : 'var(--line)'}` }}>
                    <div style={{ width: 52, flexShrink: 0, fontSize: 11, fontWeight: isCurrent ? 700 : 400, color: isCurrent ? 'var(--primary)' : 'var(--muted)' }}>{label}</div>
                    <div style={{ flex: 1, height: 6, borderRadius: 3, background: 'var(--line)', overflow: 'hidden' }}>
                      <div style={{ height: '100%', width: `${barW}%`, background: isCurrent ? 'var(--primary)' : 'var(--primary-200, #7ab8e8)', borderRadius: 3 }} />
                    </div>
                    <div style={{ width: 90, textAlign: 'right', fontSize: 12.5, fontWeight: 600, color: val > 0 ? 'var(--text)' : 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                      {val > 0 ? fmtBRL(val) : '—'}
                    </div>
                  </div>
                );
              })
          }
        </div>
      )}

      {/* Contratos */}
      {view === 'contratos' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {contratos.length === 0
            ? <EmptyState label="Nenhum contrato registrado ainda." />
            : contratos.map(c => (
                <div key={c.id} style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 10, padding: '10px 14px' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
                        <span style={tipoChip}>{c.categoria_label}</span>
                        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{c.parceira}</span>
                        <span style={{ fontSize: 12, color: 'var(--muted)' }}>— {c.produto}{c.detalhe ? ` · ${c.detalhe}` : ''}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 16, marginTop: 5, flexWrap: 'wrap' }}>
                        <MetaItem label="Fechamento" value={fmtDateBR(c.data_fechamento)} />
                        <MetaItem label="Valor" value={fmtBRL(c.valor)} />
                        <MetaItem label="Cargo" value={c.cargo} />
                        <MetaItem label="PPs" value={fmtPP(c.pps_total)} />
                        <MetaItem label="1º Ano" value={c.is_variavel ? 'Variável' : fmtBRL(c.comissao_y1)} accent={!c.is_variavel} />
                      </div>
                    </div>
                    <button onClick={() => excluir(c.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 14, padding: '2px 4px', flexShrink: 0 }}>✕</button>
                  </div>
                </div>
              ))
          }
        </div>
      )}

      {showImport && <ImportarWinner onClose={() => setShowImport(false)} onImported={() => { setShowImport(false); load(); }} />}
    </div>
  );
}

// ─── Formulário ───────────────────────────────────────────────

function FormContrato({ form, setForm, liveCalc, saving, erro, onSalvar, onCancel }: {
  form: FormState;
  setForm: React.Dispatch<React.SetStateAction<FormState>>;
  liveCalc: { pps: number; y1: number; y2: number; m1: number; isVar: boolean; fin: number | null } | null;
  saving: boolean; erro: string; onSalvar: () => void; onCancel: () => void;
}) {
  const cat       = CATS[form.catId];
  const parceiras = cat ? getParceiras(form.catId) : [];
  const produtos  = form.parceira ? getProdutos(form.catId, form.parceira) : [];
  const detalhes  = form.produto ? getDetalhes(form.catId, form.parceira, form.produto) : [];
  const isAP      = !!cat?.isAP;
  const needDetalhe  = detalhes.length > 1 || (detalhes.length === 1 && detalhes[0] !== '');
  const needParcelas = !!findPlano(form.catId, form.parceira, form.produto, form.detalhe)?.parcelavel;

  const setCat = (catId: string) => setForm(f => ({ ...f, catId, parceira: '', produto: '', detalhe: '', valor: '', ppsWinner: '' }));

  const setCargo = (cargo: string) => {
    const ppshist = isAP ? String(inferPPsHist(cargo)) : form.ppshist;
    setForm(f => ({ ...f, cargo, ppshist }));
  };

  const setPPsWinner = (ppsStr: string) => {
    const ppsNum = parseFloat(ppsStr) || 0;
    const valorAP = ppsNum > 0 ? String((ppsNum * 200).toFixed(2)) : '';
    setForm(f => ({ ...f, ppsWinner: ppsStr, valor: valorAP, prodmes: valorAP }));
  };

  // PPs históricos inferred do cargo
  const pphistInferido = inferPPsHist(form.cargo);

  return (
    <div style={{ background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 12, padding: 16 }}>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 14 }}>Registrar contrato</div>

      {/* Categoria + Cargo */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
        <Fld label="Categoria" flex>
          <select value={form.catId} onChange={e => setCat(e.target.value)} style={inp}>
            {Object.entries(CATS).map(([id, c]) => <option key={id} value={id}>{c.label}</option>)}
          </select>
        </Fld>
        <Fld label="Cargo" flex>
          <select value={form.cargo} onChange={e => setCargo(e.target.value)} style={inp}>
            <option value="">— Selecionar —</option>
            {CARGO_NAMES.map(n => <option key={n} value={n}>{n} ({(CARGOS[n] * 100).toFixed(1)}%)</option>)}
          </select>
        </Fld>
      </div>

      {/* ── AP simplificada ─────────────────────────────────── */}
      {isAP && (
        <>
          <div style={{ padding: '10px 12px', background: 'rgba(74,144,200,.06)', border: '1px solid rgba(74,144,200,.15)', borderRadius: 8, fontSize: 12, color: 'var(--muted)', marginBottom: 12 }}>
            Digite os <strong>PPs do Winner</strong> e o sistema calcula o valor real automaticamente (PPs × 200, já incluindo juros de parcelamento).
            {pphistInferido > 0 && <span> · PPs históricos inferidos do cargo: <strong>{pphistInferido.toLocaleString('pt-BR')}</strong></span>}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Fld label="PPs do contrato (do Winner)" flex>
              <input type="number" step="0.0001" min="0" value={form.ppsWinner} onChange={e => setPPsWinner(e.target.value)} style={inp} placeholder="Ex: 32.0442" autoFocus />
            </Fld>
            <Fld label="Valor real calculado (R$)" flex>
              <input type="number" readOnly value={form.valor} style={{ ...inp, background: 'var(--bg-card)', color: parseBR(form.valor) > 0 ? 'var(--text)' : 'var(--muted)' }} placeholder="Preenchido automaticamente" />
            </Fld>
            <Fld label="Parcelas AP (1–12)" flex>
              <input type="number" min="1" max="12" value={form.apParcelas} onChange={e => setForm(f => ({ ...f, apParcelas: e.target.value }))} style={inp} />
            </Fld>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 12 }}>
            <Fld label="PPs históricos" flex>
              <input type="number" min="0" value={form.ppshist} onChange={e => setForm(f => ({ ...f, ppshist: e.target.value }))} style={inp} placeholder={pphistInferido > 0 ? String(pphistInferido) : '0'} />
            </Fld>
            <Fld label="Prod. equipe direta (R$)" flex>
              <input type="number" min="0" value={form.prodeq} onChange={e => setForm(f => ({ ...f, prodeq: e.target.value }))} style={inp} placeholder="0 (só líderes)" />
            </Fld>
          </div>
        </>
      )}

      {/* ── Outros produtos ─────────────────────────────────── */}
      {!isAP && (
        <>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <Fld label="Parceira" flex>
              <select value={form.parceira} onChange={e => setForm(f => ({ ...f, parceira: e.target.value, produto: '', detalhe: '' }))} style={inp} disabled={!parceiras.length}>
                <option value="">— Parceira —</option>
                {parceiras.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Fld>
            <Fld label="Produto" flex>
              <select value={form.produto} onChange={e => setForm(f => ({ ...f, produto: e.target.value, detalhe: '' }))} style={inp} disabled={!form.parceira}>
                <option value="">— Produto —</option>
                {produtos.map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </Fld>
            {needDetalhe && (
              <Fld label="Detalhe" flex>
                <select value={form.detalhe} onChange={e => setForm(f => ({ ...f, detalhe: e.target.value }))} style={inp} disabled={!form.produto}>
                  <option value="">— Detalhe —</option>
                  {detalhes.map(d => <option key={d} value={d}>{d || '—'}</option>)}
                </select>
              </Fld>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, marginBottom: 12, flexWrap: 'wrap' }}>
            <Fld label={cat?.tipoValor?.split('(')[0]?.trim() ?? 'Valor'} flex>
              <input type="number" min="0" value={form.valor} onChange={e => setForm(f => ({ ...f, valor: e.target.value }))} style={inp} placeholder="0,00" />
            </Fld>
            <Fld label="Data de fechamento" flex>
              <input type="date" value={form.data_fechamento} onChange={e => setForm(f => ({ ...f, data_fechamento: e.target.value }))} style={inp} />
            </Fld>
            {needParcelas && (
              <Fld label="Parcelas (1–36)" flex>
                <input type="number" min="1" max="36" value={form.parcelas} onChange={e => setForm(f => ({ ...f, parcelas: e.target.value }))} style={inp} />
              </Fld>
            )}
          </div>
        </>
      )}

      {/* Data (AP) */}
      {isAP && (
        <Fld label="Data de fechamento">
          <input type="date" value={form.data_fechamento} onChange={e => setForm(f => ({ ...f, data_fechamento: e.target.value }))} style={{ ...inp, maxWidth: 200 }} />
        </Fld>
      )}

      {/* Preview */}
      {liveCalc && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '10px 12px', background: 'rgba(74,144,200,.06)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, marginBottom: 12, marginTop: 4 }}>
          <PreviewKpi label="PPs" value={fmtPP(liveCalc.pps)} />
          <PreviewKpi label="Comissão M1" value={liveCalc.isVar ? 'Variável' : fmtBRL(liveCalc.m1)} />
          <PreviewKpi label="1º Ano" value={liveCalc.isVar ? 'Variável' : fmtBRL(liveCalc.y1)} accent />
          {liveCalc.y2 > 0 && <PreviewKpi label="2º Ano" value={fmtBRL(liveCalc.y2)} />}
          {liveCalc.fin !== null && <PreviewKpi label="Alíquota AP" value={`${(liveCalc.fin * 100).toFixed(1)}%`} accent />}
        </div>
      )}

      {erro && <div style={errorBox}>{erro}</div>}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button onClick={onCancel} style={btnGhost}>Cancelar</button>
        <button onClick={onSalvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>{saving ? 'Salvando...' : 'Salvar contrato'}</button>
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────

function KpiCard({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: boolean }) {
  return (
    <div style={{ padding: '10px 14px', borderRadius: 10, background: 'var(--bg-soft)', border: `1px solid ${accent ? 'var(--primary)' : 'var(--line)'}`, borderLeft: `3px solid ${accent ? 'var(--primary)' : 'var(--line)'}` }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 3 }}>{label}</div>
      <div style={{ fontSize: 16, fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{sub}</div>
    </div>
  );
}

function MetaItem({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ fontSize: 12, fontWeight: 500, color: accent ? 'var(--primary)' : 'var(--text)', marginTop: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function PreviewKpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ textAlign: 'center', minWidth: 80 }}>
      <div style={{ fontSize: 9, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', marginBottom: 2 }}>{label}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Fld({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ marginBottom: 4, flex: flex ? 1 : undefined, minWidth: flex ? 150 : undefined }}>
      <div style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{label}</div>
      {children}
    </div>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13, background: 'var(--bg-soft)', borderRadius: 10, border: '1px dashed var(--line)' }}>
      {label}
    </div>
  );
}

// ─── Estilos ──────────────────────────────────────────────────
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost:   React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const inp:        React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 12.5, boxSizing: 'border-box' };
const tabBase:    React.CSSProperties = { padding: '8px 14px', border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 12.5, fontWeight: 600, marginBottom: -1 };
const tipoChip:   React.CSSProperties = { fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'rgba(74,144,200,.1)', color: 'var(--primary)' };
const errorBox:   React.CSSProperties = { padding: '9px 12px', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, color: '#dc2626', fontSize: 12.5, marginBottom: 12 };
