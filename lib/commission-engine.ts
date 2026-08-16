// ============================================================
// W1 — Motor de Cálculo de Comissões
// Espelho fiel do HTML "Calculadora_PPs_Comissoes_W1"
// ============================================================

export const CARGOS: Record<string, number> = {
  "Financial Advisor I":   0.075,
  "Financial Advisor II":  0.15,
  "Financial Advisor III": 0.175,
  "Financial Advisor IV":  0.20,
  "Partner":               0.24,
  "Senior Partner":        0.275,
  "Associate Partner":     0.30,
  "Principal":             0.3025,
  "Managing Partner":      0.305,
  "Member of Board":       0.305,
  "Consultor +2000 PPs":   0.40,
  "Consultor +3000 PPs":   0.45,
};

export const CARGO_NAMES = Object.keys(CARGOS);

// ─── Tipos ────────────────────────────────────────────────────

export type Plano = {
  p: string;        // parceira
  n: string;        // produto
  d: string;        // detalhe
  f: number;        // fator PPs
  r1: number[];     // taxas mensais ano 1 (12 valores)
  r2: number;       // taxa mensal recorrente ano 2+
  obs?: string;
  // Flags especiais
  comFlat?: number;                   // W1 Palestras: comissão fixa
  ppCalc?: 'novo' | 'mudanca';        // W1 Capital
  ppMult50?: boolean;                 // W1 FIP
  precoFixo?: number;                 // W1 Acompanhamento
  ppFixo?: number;
  comCargo?: Record<string, number>;  // W1 Acompanhamento / Patrimonial
  parcelavel?: boolean;               // W1 Patrimonial / Business
  ppDiv200?: boolean;
  autoFill?: boolean;
};

export type Categoria = {
  label: string;
  tipoValor: string;
  planos: Plano[];
  isAP?: boolean;
  isW1?: boolean;
};

export type CalcResult = {
  pps:      number;
  meses:    number[];   // ano 1 — 12 valores relativos ao fechamento
  meses2:   number[];   // ano 2
  meses3:   number[];   // ano 3
  y1:       number;
  y2:       number;
  y3:       number;
  isVar:    boolean;
};

// ─── Dados dos planos ─────────────────────────────────────────
// Subconjunto dos produtos mais relevantes para o consultor W1.
// Espelho fiel das tabelas do HTML original.

export const CATS: Record<string, Categoria> = {

  consorcio: {
    label: "Consórcio", tipoValor: "Valor da Carta (R$)",
    planos: [
      {p:"Porto Seguro",n:"Consórcio imóvel",d:"5 parcelas",f:0.0002,r1:[0.008,0.008,0.008,0.008,0.008,0,0,0,0,0,0,0],r2:0},
      {p:"Porto Seguro",n:"Consórcio imóvel",d:"6 parcelas",f:0.0002,r1:[0.008,0.004,0.004,0.006,0.008,0.01,0,0,0,0,0,0],r2:0},
      {p:"Porto Seguro",n:"Consórcio imóvel",d:"12 parcelas",f:0.0002,r1:[0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333],r2:0},
      {p:"Porto Seguro",n:"Consórcio imóvel Campanha",d:"Contrato fechado em 07/2026|Grupo 200 meses",f:0.0002,r1:[0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0032,0.0048],r2:0},
      {p:"Porto Seguro",n:"Consórcio imóvel Campanha",d:"Contrato fechado em 07/2026|Grupo 240 meses",f:0.0002,r1:[0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.003128,0.0056],r2:0},
      {p:"Porto Seguro",n:"Consórcio automóvel",d:"4 parcelas",f:0.0002,r1:[0.01,0.01,0.01,0.01,0,0,0,0,0,0,0,0],r2:0},
      {p:"Porto Seguro",n:"Consórcio automóvel",d:"6 parcelas",f:0.0002,r1:[0.006667,0.006667,0.006667,0.006667,0.006667,0.006667,0,0,0,0,0,0],r2:0},
      {p:"Itaú",n:"Consórcio imóvel",d:"< R$ 400k",f:0.0002,r1:[0.008,0.004,0.004,0.006,0.008,0.01,0,0,0,0,0,0],r2:0},
      {p:"Itaú",n:"Consórcio imóvel",d:">= R$ 400k",f:0.0002,r1:[0.005,0.005,0.005,0.005,0.005,0.005,0.005,0.005,0,0,0,0],r2:0},
      {p:"Itaú",n:"Consórcio automóvel",d:"Power",f:0.0002,r1:[0.01,0.01,0.01,0.01,0,0,0,0,0,0,0,0],r2:0},
      {p:"Itaú",n:"Consórcio automóvel",d:"Energy",f:0.0002,r1:[0.01,0.01,0.01,0.01,0.005,0,0,0,0,0,0,0],r2:0},
      {p:"Embracon",n:"Consórcio imóvel",d:"Select Mais",f:0.0002,r1:[0.015,0.01,0.01,0.005,0,0,0,0,0,0,0,0],r2:0},
      {p:"Embracon",n:"Consórcio automóvel",d:"Select Mais",f:0.0002,r1:[0.015,0.01,0.01,0.005,0,0,0,0,0,0,0,0],r2:0},
      {p:"Embracon",n:"Consórcio imóvel",d:"Plano Reduzido / Nacional B",f:0.0002,r1:[0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333,0.003333],r2:0},
      {p:"BB Consórcios",n:"Consórcio imóvel",d:"",f:0.0002,r1:[0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0.004,0,0],r2:0},
      {p:"BB Consórcios",n:"Consórcio automóvel",d:"",f:0.0002,r1:[0.006,0.006,0.006,0.004,0.006,0.006,0.006,0,0,0,0,0],r2:0},
      {p:"Mapfre",n:"Consórcio imóvel",d:"",f:0.0002,r1:[0.025,0,0.005,0,0,0,0,0,0,0,0,0],r2:0},
      {p:"Mapfre",n:"Consórcio automóvel",d:"",f:0.0002,r1:[0.025,0,0.005,0,0.005,0,0,0,0,0,0,0],r2:0},
      {p:"BR Consórcios",n:"Consórcio imóvel",d:"",f:0.000175,r1:[0.025,0,0.005,0,0,0,0,0,0,0,0,0],r2:0.005},
      {p:"BR Consórcios",n:"Consórcio automóvel",d:"",f:0.000175,r1:[0.025,0,0.005,0,0.005,0,0,0,0,0,0,0],r2:0},
    ],
  },

  seguroVida: {
    label: "Seguro de Vida", tipoValor: "Prêmio Mensal (R$)",
    planos: [
      {p:"MAG",n:"Vida Toda",d:"",f:0.01905,r1:[1.5,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21,0.21],r2:0.21},
      {p:"MAG",n:"Vida Inteira Resgatável",d:"Pagamento vitalício",f:0.0185,r1:[1.5,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2],r2:0.2},
      {p:"MAG",n:"Vida Inteira Resgatável",d:"VIR com pagamento antecipado por tempo (15, 20, 25, ou 30 anos) ou por idade (60 ou 65 anos)",f:0.0155,r1:[2.0,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1],r2:0.1},
      {p:"MAG",n:"PCHV",d:"Plano 530 - PCHV e Morte Linha Regulares",f:0.006,r1:[0.5,0.075,0.075,0.075,0.075,0.075,0.075,0.075,0.075,0.075,0.075,0.075],r2:0.075},
      {p:"MAG",n:"Vida em Grupo",d:"",f:0.016,r1:[1.0,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2,0.2],r2:0.2},
      {p:"MAG",n:"Private - Whole Life",d:"10 anos",f:0.0378,r1:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],r2:0.18},
      {p:"MAG",n:"Private - Whole Life",d:"30 anos/vitalício | CS>= R$ 1 MM",f:0.0378,r1:[0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7,0.7],r2:0.14},
      {p:"Prudential",n:"Vida Inteira",d:"10/20/30 anos | >= R$ 420",f:0.03,r1:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],r2:0.15},
      {p:"Prudential",n:"Temporário e Temporário Decrescente",d:"Qualquer pagamento | >= R$ 1,12 MM",f:0.03,r1:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],r2:0.15},
      {p:"Prudential",n:"Coberturas Adicionais",d:"",f:0.03,r1:[0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5,0.5],r2:0.15},
    ],
  },

  prev: {
    label: "Previdência", tipoValor: "Aporte Mensal (R$)",
    planos: [
      {p:"XP",n:"Prev XP PGBL/VGBL",d:"",f:0.00125,r1:[0.5,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15],r2:0.05},
      {p:"Icatu",n:"Icatu PGBL/VGBL",d:"",f:0.001,r1:[0.5,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15],r2:0.05},
      {p:"Brasilprev",n:"Brasilprev PGBL/VGBL",d:"",f:0.001,r1:[0.5,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1,0.1],r2:0.05},
      {p:"Zurich",n:"Zurich PGBL/VGBL",d:"",f:0.001,r1:[0.5,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15],r2:0.05},
      {p:"Porto Seguro",n:"Porto Prev PGBL/VGBL",d:"",f:0.001,r1:[0.5,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15,0.15],r2:0.05},
    ],
  },

  saude: {
    label: "Plano de Saúde", tipoValor: "Prêmio Mensal (R$)",
    planos: [
      {p:"Bradesco",n:"Pessoa Física",d:"",f:0.011,r1:[1.0,0.5,0.5,0,0,0,0,0,0,0,0,0],r2:0.1},
      {p:"Bradesco",n:"Pequenas e Médias Empresas (PME)",d:"",f:0.0105,r1:[1.0,0.5,0.0,0,0,0,0,0,0,0,0,0],r2:0.1},
      {p:"Amil",n:"Pessoa Física",d:"",f:0.0105,r1:[1.0,0.5,0.5,0,0,0,0,0,0,0,0,0],r2:0.1},
      {p:"SulAmérica",n:"Pessoa Física",d:"",f:0.011,r1:[1.0,0.5,0.5,0,0,0,0,0,0,0,0,0],r2:0.1},
      {p:"SulAmérica",n:"Pequenas e Médias Empresas (PME)",d:"Até 29 Vidas",f:0.0125,r1:[1.0,0.7,0.8,0,0,0,0,0,0,0,0,0],r2:0},
      {p:"Unimed",n:"Pessoa Física",d:"",f:0.0065,r1:[1.0,0.3,0.1,0,0,0,0,0,0,0,0,0],r2:0},
      {p:"Porto Seguro",n:"Pessoa Física",d:"",f:0.0125,r1:[1.0,0.7,0.8,0,0,0,0,0,0,0,0,0],r2:0},
    ],
  },

  produtosW1: {
    label: "Produtos W1", tipoValor: "Prêmio Mensal (R$)", isW1: true,
    planos: [
      {p:"W1",n:"Acompanhamento Standard",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,precoFixo:149.90,ppFixo:8.994,comCargo:{"Financial Advisor I":0.5,"Financial Advisor II":0.5,"Financial Advisor III":0.5,"Financial Advisor IV":0.5,"Partner":0.58,"Senior Partner":0.62,"Associate Partner":0.623,"Principal":0.6255,"Managing Partner":0.628,"Member of Board":0.628,"Consultor +2000 PPs":0.628,"Consultor +3000 PPs":0.628},autoFill:true},
      {p:"W1",n:"Acompanhamento Premium",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,precoFixo:199.90,ppFixo:11.994,comCargo:{"Financial Advisor I":0.5,"Financial Advisor II":0.5,"Financial Advisor III":0.5,"Financial Advisor IV":0.5,"Partner":0.58,"Senior Partner":0.62,"Associate Partner":0.623,"Principal":0.6255,"Managing Partner":0.628,"Member of Board":0.628,"Consultor +2000 PPs":0.628,"Consultor +3000 PPs":0.628},autoFill:true},
      {p:"W1",n:"Acompanhamento Infinity",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,precoFixo:349.90,ppFixo:20.994,comCargo:{"Financial Advisor I":0.5,"Financial Advisor II":0.5,"Financial Advisor III":0.5,"Financial Advisor IV":0.5,"Partner":0.58,"Senior Partner":0.62,"Associate Partner":0.623,"Principal":0.6255,"Managing Partner":0.628,"Member of Board":0.628,"Consultor +2000 PPs":0.628,"Consultor +3000 PPs":0.628},autoFill:true},
      {p:"W1",n:"Acompanhamento Private",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,precoFixo:649.90,ppFixo:38.994,comCargo:{"Financial Advisor I":0.5,"Financial Advisor II":0.5,"Financial Advisor III":0.5,"Financial Advisor IV":0.5,"Partner":0.58,"Senior Partner":0.62,"Associate Partner":0.623,"Principal":0.6255,"Managing Partner":0.628,"Member of Board":0.628,"Consultor +2000 PPs":0.628,"Consultor +3000 PPs":0.628},autoFill:true},
      {p:"W1",n:"Palestras",d:"Indicou",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,comFlat:0.25,ppDiv200:true},
      {p:"W1",n:"Palestras",d:"Palestrante",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,comFlat:0.25,ppDiv200:true},
      {p:"W1",n:"Palestras",d:"Indicou + Palestrante",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,comFlat:0.5,ppDiv200:true},
      {p:"W1",n:"W1 Patrimonial",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,comCargo:{"Financial Advisor I":0.1,"Financial Advisor II":0.1,"Financial Advisor III":0.1,"Financial Advisor IV":0.1,"Partner":0.13,"Senior Partner":0.145,"Associate Partner":0.15,"Principal":0.1525,"Managing Partner":0.155,"Member of Board":0.155,"Consultor +2000 PPs":0,"Consultor +3000 PPs":0},ppDiv200:true,parcelavel:true},
      {p:"W1",n:"W1 Business",d:"",f:0,r1:[0,0,0,0,0,0,0,0,0,0,0,0],r2:0,comCargo:{"Financial Advisor I":0.1,"Financial Advisor II":0.1,"Financial Advisor III":0.1,"Financial Advisor IV":0.1,"Partner":0.13,"Senior Partner":0.145,"Associate Partner":0.15,"Principal":0.1525,"Managing Partner":0.155,"Member of Board":0.155,"Consultor +2000 PPs":0,"Consultor +3000 PPs":0},ppDiv200:true,parcelavel:true},
    ],
  },

  ap: {
    label: "Análise Paga (AP)", tipoValor: "Valor da AP (R$)", isAP: true,
    planos: [],
  },

};

// ─── Motor de cálculo ─────────────────────────────────────────

/** Calcula comissão e PPs para um contrato padrão */
export function calcContrato(
  catId: string,
  plano: Plano,
  valor: number,
  cargo: string,
  parcelas = 1,
): CalcResult {
  const cat = CATS[catId];
  if (!cat || !plano || !valor) {
    return { pps: 0, meses: Array(12).fill(0), meses2: Array(12).fill(0), meses3: Array(12).fill(0), y1: 0, y2: 0, y3: 0, isVar: false };
  }

  const cargoPct = CARGOS[cargo] ?? 0;
  let pps = 0;
  const meses: number[]  = Array(12).fill(0);
  const meses2: number[] = Array(12).fill(0);
  const meses3: number[] = Array(12).fill(0);

  // ── W1 Acompanhamento (preço fixo, comissão por cargo) ────
  if (plano.precoFixo !== undefined && plano.comCargo) {
    const preco = plano.precoFixo;
    pps = plano.ppFixo ?? 0;
    const pct = plano.comCargo[cargo] ?? 0;
    const cm = preco * pct;
    for (let i = 0; i < 12; i++) { meses[i] = cm; meses2[i] = cm; meses3[i] = cm; }
    return { pps, meses, meses2, meses3, y1: cm * 12, y2: cm * 12, y3: cm * 12, isVar: !pct };
  }

  // ── W1 Palestras (comissão flat) ──────────────────────────
  if (plano.comFlat !== undefined) {
    pps = plano.ppDiv200 ? valor / 200 : 0;
    meses[0] = valor * plano.comFlat;
    return { pps, meses, meses2, meses3, y1: meses[0], y2: 0, y3: 0, isVar: false };
  }

  // ── W1 Patrimonial / Business (parcelável, comCargo) ──────
  if (plano.comCargo && plano.parcelavel) {
    pps = plano.ppDiv200 ? valor / 200 : 0;
    const pct = plano.comCargo[cargo] ?? 0;
    const n = Math.min(Math.max(parcelas, 1), 36);
    if (pct && n) {
      const each = (valor * pct) / n;
      for (let k = 0; k < n; k++) {
        if (k < 12) meses[k] = each;
        else if (k < 24) meses2[k - 12] = each;
        else meses3[k - 24] = each;
      }
    }
    const y1 = meses.reduce((a, b) => a + b, 0);
    const y2 = meses2.reduce((a, b) => a + b, 0);
    const y3 = meses3.reduce((a, b) => a + b, 0);
    return { pps, meses, meses2, meses3, y1, y2, y3, isVar: !pct };
  }

  // ── Padrão (Consórcio, Vida, Previdência, Saúde, Crédito) ─
  pps = valor * (plano.f ?? 0);
  const isVar = (plano.r1 ?? []).every(v => v === 0) && !plano.r2;
  if (!isVar && cargoPct) {
    for (let m = 0; m < 12; m++) meses[m] = valor * (plano.r1[m] ?? 0) * cargoPct;
    const recorrente = valor * (plano.r2 ?? 0) * cargoPct;
    for (let m = 0; m < 12; m++) { meses2[m] = recorrente; meses3[m] = recorrente; }
  }
  const y1 = meses.reduce((a, b) => a + b, 0);
  const y2 = meses2.reduce((a, b) => a + b, 0);
  return { pps, meses, meses2, meses3, y1, y2, y3: y2, isVar };
}

// ─── Análise Paga (AP) — cálculo autônomo ────────────────────

export function calcAP(valorAP: number, ppshist: number, prodmes: number, prodeq: number, parcelas: number) {
  const pMes  = apPctMes(prodmes);
  const pHist = apPctHist(ppshist);
  const pEq   = apPctEquipe(prodeq);
  const fin   = Math.max(pMes, pHist, pEq);
  const comAP = valorAP * fin;
  const pps   = valorAP / 200;
  const n     = Math.min(Math.max(parcelas, 1), 12);
  const meses = Array(12).fill(0);
  for (let i = 0; i < n; i++) meses[i] = comAP / n;
  return { pMes, pHist, pEq, fin, comAP, pps, meses };
}

function apPctMes(v: number) {
  if (v <= 4999.99)  return 0.20;
  if (v <= 7499.99)  return 0.35;
  if (v <= 14999.99) return 0.40;
  if (v <= 29999.99) return 0.45;
  if (v <= 49999.99) return 0.50;
  return 0.525;
}
function apPctHist(p: number) {
  if (p >= 3000) return 0.45;
  if (p >= 2000) return 0.40;
  return 0;
}
function apPctEquipe(v: number) {
  if (v <= 0)         return 0;
  if (v <= 29999.99)  return 0.27;
  if (v <= 49999.99)  return 0.28;
  if (v <= 74999.99)  return 0.29;
  if (v <= 149999.99) return 0.305;
  if (v <= 249999.99) return 0.315;
  return 0.325;
}

// ─── Utilitários de projeção ──────────────────────────────────

/** Retorna chave "YYYY-MM" para uma data */
export function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

/** Adiciona N meses a uma data ISO (YYYY-MM-DD) */
export function addMonths(isoDate: string, n: number): Date {
  const [y, m, d] = isoDate.split('-').map(Number);
  const dt = new Date(y, m - 1 + n, d);
  return dt;
}

export type ContratoRow = {
  id: string;
  parceira: string;
  produto: string;
  detalhe: string;
  cargo: string;
  categoria_label: string;
  valor: number;
  data_fechamento: string;  // YYYY-MM-DD
  pps_total: number;
  comissao_y1: number;
  comissao_y2: number;
  meses_y1: number[];
  meses_y2: number[];
  meses_y3: number[];
  is_variavel: boolean;
  pessoa_id: string | null;
};

/** Agrega todos os contratos em um mapa {YYYY-MM -> total R$} */
export function buildProjection(contratos: ContratoRow[], months = 18): Map<string, number> {
  const map = new Map<string, number>();
  const hoje = new Date();

  // Inicializa os próximos N meses com 0
  for (let i = 0; i < months; i++) {
    const dt = new Date(hoje.getFullYear(), hoje.getMonth() + i, 1);
    map.set(monthKey(dt), 0);
  }

  for (const c of contratos) {
    const add = (offsetMonths: number, value: number) => {
      if (!value) return;
      const dt = addMonths(c.data_fechamento, offsetMonths);
      const key = monthKey(dt);
      if (map.has(key)) map.set(key, (map.get(key) ?? 0) + value);
    };

    // Ano 1: meses_y1[0..11] → data_fechamento + 0..11
    (c.meses_y1 ?? []).forEach((v, i) => add(i, v));
    // Ano 2: meses_y2[0..11] → data_fechamento + 12..23
    (c.meses_y2 ?? []).forEach((v, i) => add(12 + i, v));
    // Ano 3: meses_y3[0..11] → data_fechamento + 24..35
    (c.meses_y3 ?? []).forEach((v, i) => add(24 + i, v));
  }

  return map;
}

// ─── Helpers de UI ────────────────────────────────────────────

export function fmtBRL(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });
}

export function fmtPP(v: number): string {
  return v.toLocaleString('pt-BR', { maximumFractionDigits: 2 }) + ' PPs';
}

/** Retorna parceiras únicas de uma categoria */
export function getParceiras(catId: string): string[] {
  const cat = CATS[catId];
  if (!cat) return [];
  return [...new Set(cat.planos.map(p => p.p))];
}

/** Retorna produtos únicos de uma parceira */
export function getProdutos(catId: string, parceira: string): string[] {
  const cat = CATS[catId];
  if (!cat) return [];
  return [...new Set(cat.planos.filter(p => p.p === parceira).map(p => p.n))];
}

/** Retorna detalhes de uma combinação parceira+produto */
export function getDetalhes(catId: string, parceira: string, produto: string): string[] {
  const cat = CATS[catId];
  if (!cat) return [];
  return cat.planos.filter(p => p.p === parceira && p.n === produto).map(p => p.d);
}

/** Encontra o plano exato */
export function findPlano(catId: string, parceira: string, produto: string, detalhe: string): Plano | null {
  const cat = CATS[catId];
  if (!cat) return null;
  return cat.planos.find(p => p.p === parceira && p.n === produto && p.d === detalhe) ?? null;
}
