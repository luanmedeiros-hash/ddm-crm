import type { RegistroDaily, RegInterno, Conversoes, Status, Tendencia, Etapa } from './types';
import { ETAPAS, ETAPAS_INDICE, PESOS_INDICE } from './constants';

// =====================================================
// Conversão entre formato Supabase e formato interno
// =====================================================
export function toRegInterno(r: RegistroDaily): RegInterno {
  const dia = new Date(r.data + 'T12:00:00');
  const dow = dia.getDay();
  const tipoDia = (dow === 0 || dow === 6) ? 'fds' as const : 'util' as const;
  return {
    data: r.data,
    consultor: r.consultor_nome,
    AA:  { meta: Number(r.AA_meta) || 0,  real: Number(r.AA_real) || 0 },
    CA:  { meta: Number(r.CA_meta) || 0,  real: Number(r.CA_real) || 0 },
    SA:  { meta: Number(r.SA_meta) || 0,  real: Number(r.SA_real) || 0 },
    EA:  { meta: Number(r.EA_meta) || 0,  real: Number(r.EA_real) || 0 },
    AF:  { meta: Number(r.AF_meta) || 0,  real: Number(r.AF_real) || 0 },
    CF:  { meta: Number(r.CF_meta) || 0,  real: Number(r.CF_real) || 0 },
    SF:  { meta: Number(r.SF_meta) || 0,  real: Number(r.SF_real) || 0 },
    EF:  { meta: Number(r.EF_meta) || 0,  real: Number(r.EF_real) || 0 },
    AP:  { meta: Number(r.AP_meta) || 0,  real: Number(r.AP_real) || 0 },
    PP:  { meta: Number(r.PP_meta) || 0,  real: Number(r.PP_real) || 0 },
    REC: { meta: Number(r.REC_meta) || 0, real: Number(r.REC_real) || 0 },
    cttQuente: r.ctt_quente || 0,
    bloqueio: r.bloqueio || 'Sem bloqueio',
    bloqueioDesc: r.bloqueio_desc || '',
    ajuda: r.ajuda || 'Não',
    confianca: r.confianca || 3,
    avanco: r.avanco || '',
    prioridade: r.prioridade || '',
    bigPoints: r.big_points || [],
    observacoes: r.observacoes || '',
    tipoDia,
  };
}

// =====================================================
// Filtros utilitários
// =====================================================
export function regsValidos(regs: RegInterno[]): RegInterno[] {
  return regs.filter(r => r.tipoDia === 'util');
}

// =====================================================
// ÍNDICE — média ponderada das % de atingimento por etapa
// Cada etapa: Σ(real) / Σ(meta) das etapas no período
// =====================================================
export function calcIndice(regs: RegInterno[]): { indice: number; porEtapa: Record<string, number> } {
  if (!regs.length) return { indice: 0, porEtapa: {} };
  const porEtapa: Record<string, number> = {};
  ETAPAS_INDICE.forEach(et => {
    let metaTot = 0, realTot = 0;
    regs.forEach(r => {
      const e = r[et];
      if (e) { metaTot += e.meta; realTot += e.real; }
    });
    porEtapa[et] = metaTot > 0 ? (realTot / metaTot) * 100 : 0;
  });
  const indice = ETAPAS_INDICE.reduce((s, et) => s + porEtapa[et] * PESOS_INDICE[et], 0);
  return { indice, porEtapa };
}

// =====================================================
// CONVERSÕES — taxas Σ(B) / Σ(A) do período
// Baseado no exemplo do usuário: "5 AA, 3 AF, 1 AP" → 60%, 33%, 20%
// =====================================================
export function calcConversoes(regs: RegInterno[]): Conversoes {
  const tot = (et: Etapa) => regs.reduce((s, r) => s + (r[et]?.real || 0), 0);
  const aa = tot('AA'), af = tot('AF'), ap = tot('AP'), rec = tot('REC');
  return {
    'AA→AF':  aa > 0 ? (af / aa) * 100  : 0,
    'AF→AP':  af > 0 ? (ap / af) * 100  : 0,
    'AA→AP':  aa > 0 ? (ap / aa) * 100  : 0,
    'AF→REC': af > 0 ? (rec / af) * 100 : 0,
    raw: { aa, af, ap, rec },
  };
}

// =====================================================
// CLASSIFICAÇÃO de status
// =====================================================
export function classificar(r: RegInterno | null | undefined): Status {
  if (!r) return 'Sem dados';
  if (r.confianca <= 2 || r.bloqueio !== 'Sem bloqueio' || r.ajuda === 'Sim') return 'Crítico';
  const indice = calcIndice([r]).indice;
  if (indice < 50) return 'Atenção';
  return 'Normal';
}

export function classificarConsultor(regs: RegInterno[]): Status {
  if (!regs.length) return 'Sem dados';
  const ult = [...regs].sort((a, b) => b.data.localeCompare(a.data))[0];
  return classificar(ult);
}

// =====================================================
// TENDÊNCIA — compara 1ª metade vs 2ª metade do período
// =====================================================
export function calcTendencia(regs: RegInterno[]): Tendencia {
  if (regs.length < 4) return { dir: 'flat', delta: 0 };
  const sorted = [...regs].sort((a, b) => a.data.localeCompare(b.data));
  const meio = Math.floor(sorted.length / 2);
  const ant = calcIndice(sorted.slice(0, meio)).indice;
  const rec = calcIndice(sorted.slice(meio)).indice;
  const delta = rec - ant;
  if (delta > 5) return { dir: 'up', delta };
  if (delta < -5) return { dir: 'down', delta };
  return { dir: 'flat', delta };
}

// =====================================================
// RECOMENDAÇÃO de gestão (HTML inline simples)
// =====================================================
export function gerarRecomendacao(reg: RegInterno | null, regs: RegInterno[]): string {
  if (!reg) return '✓ Sem dados recentes para análise. <strong>Cobrar preenchimento.</strong>';
  const status = classificar(reg);
  const indice = calcIndice(regs).indice;
  const conv = calcConversoes(regs);
  const totAA = conv.raw.aa, totAP = conv.raw.ap;

  if (status === 'Crítico') {
    if (reg.ajuda === 'Sim' && reg.bloqueio === 'Proposta travada')
      return '🔓 <strong>Destravar negociação:</strong> consultor possui proposta parada e pediu ajuda. Agendar conversa direta com o decisor do cliente ainda hoje.';
    if (reg.ajuda === 'Sim')
      return '🆘 <strong>Atendimento prioritário:</strong> consultor pediu ajuda. Agendar 1:1 ainda hoje para destravar.';
    if (reg.confianca <= 2 && reg.bloqueio !== 'Sem bloqueio')
      return '🔍 <strong>Acompanhar de perto:</strong> confiança baixa + bloqueio. Investigar causa raiz e oferecer suporte direto.';
    return '⚠️ <strong>Atenção crítica:</strong> bloqueio aberto que pode comprometer entrega. Definir desbloqueador hoje.';
  }
  if (status === 'Atenção') {
    if (totAA > 5 && totAP < 2)
      return '🎯 <strong>Treinar abordagem:</strong> alto volume de AA mas baixa conversão para AP. Avaliar qualidade do pipeline e técnica de qualificação.';
    if (indice < 50)
      return `👀 <strong>Monitorar evolução:</strong> índice baixo (${indice.toFixed(0)}%). Reforçar prioridades e cobrar metas.`;
    return '👀 <strong>Monitorar:</strong> ritmo abaixo do ideal mas sem bloqueios. Reforçar prioridades da semana.';
  }
  if (totAP >= 3)
    return `🏆 <strong>Reconhecer publicamente:</strong> índice de ${indice.toFixed(0)}% e bom volume de AP. Citar como exemplo na próxima daily.`;
  return '✓ <strong>Manter ritmo:</strong> indicadores saudáveis. Aproveitar para alongar pipeline com novas AA.';
}

// =====================================================
// FORMATTERS
// =====================================================
export const fmtData = (d: Date): string => d.toISOString().slice(0, 10);
export const fmtDataBR = (d: Date): string => d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
export const fmtDataBRLong = (d: Date): string => d.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

export function tipoDia(d: Date): 'util' | 'fds' {
  const dow = d.getDay();
  return (dow === 0 || dow === 6) ? 'fds' : 'util';
}

// =====================================================
// GERADOR DE DATAS — últimos N dias úteis (para mock e listagem)
// =====================================================
export function ultimosDiasUteis(n: number): Date[] {
  const dias: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  let cursor = new Date(d);
  while (dias.length < n) {
    if (tipoDia(cursor) === 'util') dias.push(new Date(cursor));
    cursor.setDate(cursor.getDate() - 1);
  }
  return dias.reverse();
}

export function intervaloUltimosDias(n: number): Date[] {
  const arr: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = n - 1; i >= 0; i--) {
    const dt = new Date(d);
    dt.setDate(d.getDate() - i);
    arr.push(dt);
  }
  return arr;
}
