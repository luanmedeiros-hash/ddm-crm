'use client';

import { useState, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import {
  CATS, CARGOS, CARGO_NAMES,
  calcContrato, calcAP,
  fmtBRL, fmtPP,
  findPlano, type Plano,
} from '@/lib/commission-engine';

// ─── Tipos ────────────────────────────────────────────────────

type WinnerRow = {
  id: string;
  status: string;
  data_assinatura: string;
  cliente: string;
  parceira: string;
  produto: string;
  ap_valor: string;
  pps: string;
};

type MappedRow = WinnerRow & {
  catId:       string | null;
  plano:       Plano | null;
  isAP:        boolean;
  valorNum:    number;   // AP: pps×200 | W1: precoFixo | outros: ap_valor
  dataISO:     string;
  selecionado: boolean;
  cargo:       string;
  parcelas12:  boolean;
};

// ─── Helpers ──────────────────────────────────────────────────

function parseBRNum(s: string): number {
  return parseFloat(s.replace(/[^\d,]/g, '').replace(',', '.')) || 0;
}

function dateToISO(s: string): string {
  if (!s) return new Date().toISOString().split('T')[0];
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const [d, m, y] = s.split('/');
  return `${y}-${m}-${d}`;
}

/** Infere os PPs históricos a partir do cargo para usar no cálculo da AP */
function inferPPsHist(cargo: string): number {
  if (cargo.includes('+3000')) return 3000;
  if (cargo.includes('+2000')) return 2000;
  return 0;
}

function mapWinnerRow(row: WinnerRow, cargoPadrao: string): Omit<MappedRow, 'selecionado'> {
  const p  = row.parceira.toLowerCase();
  const pr = row.produto.toLowerCase();

  // ── Análise Paga: valor real = PPs × 200 ─────────────────
  if (pr.includes('análise paga') || pr.includes('analise paga') || pr === 'ap') {
    const ppsNum    = parseBRNum(row.pps);
    const valorReal = ppsNum * 200;
    return { ...row, catId: 'ap', plano: null, isAP: true, valorNum: valorReal, dataISO: dateToISO(row.data_assinatura), cargo: cargoPadrao, parcelas12: false };
  }

  // ── W1 Acompanhamento ────────────────────────────────────
  if (p.includes('w1')) {
    let nome = '';
    if      (pr.includes('standard') || pr.includes('149')) nome = 'Acompanhamento Standard';
    else if (pr.includes('premium')  || pr.includes('199')) nome = 'Acompanhamento Premium';
    else if (pr.includes('infinity') || pr.includes('349')) nome = 'Acompanhamento Infinity';
    else if (pr.includes('private')  || pr.includes('649')) nome = 'Acompanhamento Private';
    if (nome) {
      const plano = findPlano('produtosW1', 'W1', nome, '');
      // Para W1 Acompanhamento, o valor armazenado é o precoFixo do plano
      const valorReal = plano?.precoFixo ?? parseBRNum(row.ap_valor);
      return { ...row, catId: 'produtosW1', plano, isAP: false, valorNum: valorReal, dataISO: dateToISO(row.data_assinatura), cargo: cargoPadrao, parcelas12: false };
    }
  }

  // ── Outras categorias ────────────────────────────────────
  for (const [catId, cat] of Object.entries(CATS)) {
    if (cat.isAP) continue;
    const match = cat.planos.find(pl => pl.p.toLowerCase().includes(p) || p.includes(pl.p.toLowerCase()));
    if (match) return { ...row, catId, plano: match, isAP: false, valorNum: parseBRNum(row.ap_valor), dataISO: dateToISO(row.data_assinatura), cargo: cargoPadrao, parcelas12: false };
  }

  return { ...row, catId: null, plano: null, isAP: false, valorNum: parseBRNum(row.ap_valor), dataISO: dateToISO(row.data_assinatura), cargo: cargoPadrao, parcelas12: false };
}

// ─── Componente ───────────────────────────────────────────────

interface Props {
  onClose: () => void;
  onImported: () => void;
}

export default function ImportarWinner({ onClose, onImported }: Props) {
  const [step, setStep]               = useState<'paste' | 'preview'>('paste');
  const [json, setJson]               = useState('');
  const [cargoPadrao, setCargoPadrao] = useState('');
  const [rows, setRows]               = useState<MappedRow[]>([]);
  const [saving, setSaving]           = useState(false);
  const [erro, setErro]               = useState('');

  function parsear() {
    setErro('');
    if (!cargoPadrao) { setErro('Selecione o cargo padrão antes de continuar.'); return; }
    let parsed: WinnerRow[];
    try { parsed = JSON.parse(json); } catch { setErro('JSON inválido. Cole exatamente o resultado do script.'); return; }
    if (!Array.isArray(parsed) || !parsed.length) { setErro('Nenhum contrato encontrado no JSON.'); return; }
    setRows(parsed.map(r => ({ ...mapWinnerRow(r, cargoPadrao), selecionado: !!r.id })));
    setStep('preview');
  }

  function updateRow(id: string, patch: Partial<MappedRow>) {
    setRows(prev => prev.map(r => r.id === id ? { ...r, ...patch } : r));
  }

  function toggleAll(val: boolean) {
    setRows(prev => prev.map(r => ({ ...r, selecionado: val })));
  }

  const selecionados = rows.filter(r => r.selecionado);

  /**
   * Calcula a produção total de AP por mês (YYYY-MM) entre os contratos selecionados.
   * A alíquota da AP depende do total produzido no mês, não de cada AP isolada.
   */
  const producaoAPPorMes = useMemo<Record<string, number>>(() => {
    const map: Record<string, number> = {};
    for (const r of rows) {
      if (!r.isAP || !r.selecionado) continue;
      const mes = r.dataISO.slice(0, 7); // YYYY-MM
      map[mes] = (map[mes] ?? 0) + r.valorNum;
    }
    return map;
  }, [rows]);

  const preview = useMemo(() => rows.map(r => {
    if (!r.selecionado) return { ...r, y1: 0, ppsCalc: 0, aliquota: 0 };
    if (r.isAP) {
      const mes        = r.dataISO.slice(0, 7);
      const prodMes    = producaoAPPorMes[mes] ?? r.valorNum; // total AP do mês
      const ppshist    = inferPPsHist(r.cargo);
      const res        = calcAP(r.valorNum, ppshist, prodMes, 0, r.parcelas12 ? 12 : 1);
      return { ...r, y1: res.comAP, ppsCalc: res.pps, aliquota: res.fin };
    }
    if (r.plano && r.catId) {
      const res = calcContrato(r.catId, r.plano, r.valorNum, r.cargo, 1);
      return { ...r, y1: res.y1, ppsCalc: res.pps, aliquota: 0 };
    }
    return { ...r, y1: 0, ppsCalc: 0, aliquota: 0 };
  }), [rows, producaoAPPorMes]);

  const totalY1  = preview.filter(r => r.selecionado).reduce((s, r) => s + r.y1, 0);
  const totalPPs = preview.filter(r => r.selecionado).reduce((s, r) => s + r.ppsCalc, 0);

  async function importar() {
    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    let erros = 0;
    for (const r of preview.filter(r => r.selecionado)) {
      let payload: Record<string, unknown> = {
        user_id: user.id,
        cargo: r.cargo,
        categoria_id: r.catId ?? 'outro',
        categoria_label: r.catId ? (CATS[r.catId]?.label ?? r.parceira) : r.parceira,
        parceira: r.parceira,
        produto: r.produto,
        detalhe: r.parcelas12 ? 'Parcelado 12x' : '',
        valor: r.valorNum,
        data_fechamento: r.dataISO,
        parcelas: r.parcelas12 ? 12 : 1,
      };

      if (r.isAP) {
        const mes     = r.dataISO.slice(0, 7);
        const prodMes = producaoAPPorMes[mes] ?? r.valorNum;
        const ppshist = inferPPsHist(r.cargo);
        const res     = calcAP(r.valorNum, ppshist, prodMes, 0, r.parcelas12 ? 12 : 1);
        payload = { ...payload, pps_total: res.pps, comissao_y1: res.comAP, comissao_y2: 0, comissao_y3: 0, meses_y1: res.meses, meses_y2: Array(12).fill(0), meses_y3: Array(12).fill(0), is_variavel: false };
      } else if (r.plano && r.catId) {
        const res = calcContrato(r.catId, r.plano, r.valorNum, r.cargo, 1);
        payload = { ...payload, pps_total: res.pps, comissao_y1: res.y1, comissao_y2: res.y2, comissao_y3: res.y3, meses_y1: res.meses, meses_y2: res.meses2, meses_y3: res.meses3, is_variavel: res.isVar };
      } else {
        payload = { ...payload, pps_total: 0, comissao_y1: 0, comissao_y2: 0, comissao_y3: 0, meses_y1: Array(12).fill(0), meses_y2: Array(12).fill(0), meses_y3: Array(12).fill(0), is_variavel: true };
      }

      const { error } = await supabase.from('contratos_comissao').insert(payload);
      if (error) erros++;
    }

    if (erros > 0) setErro(`${erros} contrato(s) não foram salvos.`);
    else { onImported(); onClose(); }
    setSaving(false);
  }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
      <div style={{ background: 'var(--bg-card)', borderRadius: 16, width: '100%', maxWidth: 920, maxHeight: '90vh', display: 'flex', flexDirection: 'column', boxShadow: '0 24px 64px rgba(0,0,0,.3)', border: '1px solid var(--line)' }}>

        {/* Header */}
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Importar do Winner</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              {step === 'paste' ? 'Cole o JSON extraído do Winner' : `${rows.length} contratos encontrados`}
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', fontSize: 18 }}>✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }}>

          {/* ── STEP 1 ── */}
          {step === 'paste' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ padding: '12px 14px', background: 'rgba(74,144,200,.06)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, fontSize: 12.5, lineHeight: 1.7 }}>
                <strong>Como exportar do Winner:</strong><br />
                1. propostas-de-produto → filtro "próprio" + Luan Medeiros → Filtrar<br />
                2. Console (F12) → cole o script → aguarde "Copiado! Total: X contratos"<br />
                3. Cole o JSON abaixo
              </div>
              <div>
                <label style={lbl}>Cargo padrão <span style={{ color: 'var(--muted)', fontWeight: 400 }}>(ajustável por contrato na próxima tela)</span></label>
                <select value={cargoPadrao} onChange={e => setCargoPadrao(e.target.value)} style={inp}>
                  <option value="">— Selecionar —</option>
                  {CARGO_NAMES.map(n => <option key={n} value={n}>{n} ({(CARGOS[n] * 100).toFixed(1)}%)</option>)}
                </select>
              </div>
              <div>
                <label style={lbl}>JSON copiado do Winner</label>
                <textarea value={json} onChange={e => setJson(e.target.value)} rows={10} placeholder='Cole aqui o JSON (começa com "[")...' style={{ ...inp, resize: 'vertical', fontFamily: 'monospace', fontSize: 11.5 }} />
              </div>
              {erro && <div style={errBox}>{erro}</div>}
              <button onClick={parsear} style={btnPrim}>Continuar →</button>
            </div>
          )}

          {/* ── STEP 2 ── */}
          {step === 'preview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>

              <div style={{ display: 'flex', gap: 8 }}>
                <Kpi label="Selecionados" value={String(selecionados.length)} />
                <Kpi label="1º Ano total" value={fmtBRL(totalY1)} accent />
                <Kpi label="PPs totais" value={fmtPP(totalPPs)} />
              </div>

              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={() => toggleAll(true)} style={btnGhost}>Selecionar todos</button>
                <button onClick={() => toggleAll(false)} style={btnGhost}>Desmarcar todos</button>
                <button onClick={() => setStep('paste')} style={btnGhost}>← Voltar</button>
                <span style={{ fontSize: 11, color: 'var(--muted)', marginLeft: 4 }}>
                  AP: valor = PPs×200 · alíquota = max(produção mês, PPs hist., equipe) · 12x = distribui em 12 meses
                </span>
              </div>

              <div style={{ border: '1px solid var(--line)', borderRadius: 8, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: 'var(--bg-soft)' }}>
                        <th style={th}>✓</th>
                        <th style={th}>Cliente</th>
                        <th style={th}>Produto</th>
                        <th style={th}>Data</th>
                        <th style={{ ...th, textAlign: 'right' }}>Valor real</th>
                        <th style={{ ...th, textAlign: 'center' }}>12x</th>
                        <th style={th}>Cargo</th>
                        <th style={{ ...th, textAlign: 'center' }}>Alíq.</th>
                        <th style={{ ...th, textAlign: 'right' }}>1º Ano</th>
                        <th style={{ ...th, textAlign: 'center' }}>Tipo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.map(r => (
                        <tr key={r.id} style={{ borderTop: '1px solid var(--line)', opacity: r.selecionado ? 1 : 0.35 }}>
                          <td style={td}><input type="checkbox" checked={r.selecionado} onChange={() => updateRow(r.id, { selecionado: !r.selecionado })} /></td>
                          <td style={td}>
                            <div style={{ fontWeight: 600, whiteSpace: 'nowrap' }}>{r.cliente.split(' ').slice(0, 2).join(' ')}</div>
                            <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{r.parceira}</div>
                          </td>
                          <td style={td}><div style={{ maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.produto}</div></td>
                          <td style={{ ...td, whiteSpace: 'nowrap' }}>{r.data_assinatura}</td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                            {fmtBRL(r.valorNum)}
                            {r.isAP && <div style={{ fontSize: 9.5, color: '#22c55e' }}>PPs×200</div>}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            <input type="checkbox" checked={r.parcelas12} onChange={() => updateRow(r.id, { parcelas12: !r.parcelas12 })} title="Distribuir comissão em 12 meses" />
                          </td>
                          <td style={td}>
                            <select value={r.cargo} onChange={e => updateRow(r.id, { cargo: e.target.value })} style={{ fontSize: 11, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)' }}>
                              <option value="">—</option>
                              {CARGO_NAMES.map(n => <option key={n} value={n}>{n}</option>)}
                            </select>
                          </td>
                          <td style={{ ...td, textAlign: 'center', color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                            {r.isAP && r.aliquota > 0 ? `${(r.aliquota * 100).toFixed(0)}%` : '—'}
                          </td>
                          <td style={{ ...td, textAlign: 'right', fontVariantNumeric: 'tabular-nums', color: r.y1 > 0 ? 'var(--primary)' : 'var(--muted)', fontWeight: r.y1 > 0 ? 600 : 400, whiteSpace: 'nowrap' }}>
                            {r.y1 > 0 ? fmtBRL(r.y1) : '—'}
                          </td>
                          <td style={{ ...td, textAlign: 'center' }}>
                            {r.isAP  ? <Chip color="#22c55e">AP</Chip>
                            : r.plano ? <Chip color="var(--primary)">✓</Chip>
                            :           <Chip color="#f59e0b">?</Chip>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {erro && <div style={errBox}>{erro}</div>}
            </div>
          )}
        </div>

        {step === 'preview' && (
          <div style={{ padding: '16px 24px', borderTop: '1px solid var(--line)', display: 'flex', justifyContent: 'flex-end', gap: 8, flexShrink: 0 }}>
            <button onClick={onClose} style={btnGhost}>Cancelar</button>
            <button onClick={importar} disabled={saving || !selecionados.length} style={{ ...btnPrim, opacity: saving || !selecionados.length ? 0.5 : 1 }}>
              {saving ? 'Importando...' : `Importar ${selecionados.length} contrato${selecionados.length !== 1 ? 's' : ''}`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Sub-componentes ──────────────────────────────────────────

function Kpi({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div style={{ flex: 1, padding: '10px 14px', borderRadius: 8, background: 'var(--bg-soft)', border: `1px solid ${accent ? 'var(--primary)' : 'var(--line)'}` }}>
      <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px' }}>{label}</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: accent ? 'var(--primary)' : 'var(--text)', fontVariantNumeric: 'tabular-nums' }}>{value}</div>
    </div>
  );
}

function Chip({ color, children }: { color: string; children: React.ReactNode }) {
  return <span style={{ display: 'inline-block', padding: '1px 6px', borderRadius: 999, fontSize: 10, fontWeight: 700, background: color + '18', color, border: `1px solid ${color}40` }}>{children}</span>;
}

// ─── Estilos ──────────────────────────────────────────────────

const lbl:     React.CSSProperties = { display: 'block', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 5 };
const inp:     React.CSSProperties = { width: '100%', padding: '8px 10px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 12.5, boxSizing: 'border-box' };
const btnPrim: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost:React.CSSProperties = { padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 12.5, cursor: 'pointer' };
const errBox:  React.CSSProperties = { padding: '9px 12px', background: 'rgba(220,38,38,.08)', border: '1px solid rgba(220,38,38,.2)', borderRadius: 8, color: '#dc2626', fontSize: 12.5 };
const th:      React.CSSProperties = { padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.4px', borderBottom: '1px solid var(--line)' };
const td:      React.CSSProperties = { padding: '7px 10px', verticalAlign: 'middle', fontSize: 12 };
