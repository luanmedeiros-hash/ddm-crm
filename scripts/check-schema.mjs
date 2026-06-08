#!/usr/bin/env node
// Compara o schema real do Supabase com o que o app espera.
// Uso: npm run db:check
// Requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (lidos do .env.local)
// e a função public.app_schema_report() criada em db/019_schema_report.sql.

import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

// ─── carrega .env.local ───────────────────────────────────────
function loadEnv() {
  try {
    const txt = readFileSync(new URL('../.env.local', import.meta.url), 'utf8');
    for (const line of txt.split('\n')) {
      const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  } catch { /* sem .env.local — usa env do ambiente */ }
}
loadEnv();

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!URL_ || !KEY) {
  console.error('✗ Faltam NEXT_PUBLIC_SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY.');
  process.exit(2);
}

// ─── famílias de tipo ─────────────────────────────────────────
function fam(t) {
  if (['text', 'character varying', 'character'].includes(t)) return 'text';
  if (['integer', 'bigint', 'smallint'].includes(t)) return 'integer';
  if (t === 'boolean') return 'boolean';
  if (['numeric', 'double precision', 'real'].includes(t)) return 'numeric';
  if (t === 'date') return 'date';
  if (t.startsWith('timestamp')) return 'timestamp';
  if (t === 'ARRAY') return 'array';
  if (t === 'uuid') return 'uuid';
  if (['json', 'jsonb'].includes(t)) return 'json';
  return t;
}

// ─── manifesto: o que o app escreve, com a família esperada ───
const ETAPAS = ['AA', 'CA', 'SA', 'EA', 'AF', 'CF', 'SF', 'EF', 'AP', 'PP', 'REC'];
const dailyEtapas = {};
for (const e of ETAPAS) { dailyEtapas[`${e}_meta`] = 'integer'; dailyEtapas[`${e}_real`] = 'integer'; }

const MANIFEST = {
  registros_daily: {
    user_id: 'uuid', consultor: 'text', data: 'date', ctt_quente: 'integer',
    bloqueio: 'text', bloqueio_desc: 'text', ajuda: 'text', confianca: 'integer',
    avanco: 'text', prioridade: 'text', big_points: 'array', observacoes: 'text',
    ...dailyEtapas,
  },
  profiles: { id: 'uuid', email: 'text', nome: 'text', role: 'text', consultor_nome: 'text' },
  pessoas: {
    nome: 'text', fase: 'text', status: 'text',
    c1: 'boolean', c2: 'boolean', c3: 'boolean', c4: 'boolean',
    data_inicio: 'date', data_fechamento: 'date',
    patrimonio: 'numeric', renda_mensal: 'numeric', perfil_risco: 'text',
    objetivo: 'text', produtos: 'array', winner_contact_id: 'text',
  },
  reunioes: {
    pessoa_id: 'uuid', user_id: 'uuid', tipo: 'text', data_reuniao: 'timestamp',
    transcricao: 'text', relatorio: 'text', contrato_gerado: 'boolean',
  },
  proximos_passos: { pessoa_id: 'uuid', user_id: 'uuid', descricao: 'text', data_prevista: 'date', feito: 'boolean' },
  atividades: { pessoa_id: 'uuid', tipo: 'text', descricao: 'text' },
};

// data_atividade pode ser date OU timestamp
const FLEX = { 'atividades.data_atividade': ['date', 'timestamp'] };

// ─── executa ──────────────────────────────────────────────────
const supabase = createClient(URL_, KEY, { auth: { persistSession: false } });
const { data: rows, error } = await supabase.rpc('app_schema_report');

if (error) {
  console.error('✗ Erro ao chamar app_schema_report():', error.message);
  console.error('  Você rodou db/019_schema_report.sql no Supabase?');
  process.exit(2);
}

const real = {};       // table -> col -> {family, nullable, hasDefault}
for (const r of rows) {
  (real[r.table_name] ??= {})[r.column_name] = {
    family: fam(r.data_type), nullable: r.is_nullable === 'YES', hasDefault: r.has_default,
  };
}

let erros = 0;
const avisos = [];

for (const [tabela, cols] of Object.entries(MANIFEST)) {
  const t = real[tabela];
  if (!t) { console.error(`✗ Tabela ausente: ${tabela}`); erros++; continue; }
  for (const [col, esperado] of Object.entries(cols)) {
    const got = t[col];
    if (!got) { console.error(`✗ ${tabela}.${col} — coluna ausente (app escreve nela)`); erros++; continue; }
    const flex = FLEX[`${tabela}.${col}`];
    const ok = flex ? flex.includes(got.family) : got.family === esperado;
    if (!ok) { console.error(`✗ ${tabela}.${col} — tipo é "${got.family}", esperado "${flex ? flex.join('/') : esperado}"`); erros++; }
  }
}

// Aviso: NOT NULL sem default (risco de erro em insert) que o app não preenche
for (const [tabela, t] of Object.entries(real)) {
  for (const [col, info] of Object.entries(t)) {
    const appEscreve = MANIFEST[tabela]?.[col] || ['id', 'created_at', 'updated_at', 'user_id', 'pessoa_id'].includes(col);
    if (!info.nullable && !info.hasDefault && !appEscreve) {
      avisos.push(`⚠️  ${tabela}.${col} é NOT NULL sem default e o app não preenche — pode quebrar inserts.`);
    }
  }
}

console.log('');
if (avisos.length) { console.log('Avisos:'); avisos.forEach(a => console.log('  ' + a)); console.log(''); }

if (erros === 0) {
  console.log('✓ Schema OK — todas as colunas que o app usa existem com o tipo esperado.');
  process.exit(0);
} else {
  console.error(`✗ ${erros} divergência(s) encontrada(s). Veja acima.`);
  process.exit(1);
}
