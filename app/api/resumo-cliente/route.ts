// app/api/resumo-cliente/route.ts
// POST { pessoaId }
// Reúne dados do cliente (perfil, jornada, reuniões, atividades, próximos passos)
// e pede ao Claude um resumo executivo + sugestão de próxima ação.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from '@/lib/supabase-server';
import { TIPO_REUNIAO_LABEL, type TipoReuniao } from '@/lib/prompts-relatorio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

function fmt(d: string | null): string {
  if (!d) return '—';
  return new Date(d.length <= 10 ? d + 'T12:00:00' : d).toLocaleDateString('pt-BR');
}

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false, error: 'no_api_key',
      message: 'Configure a ANTHROPIC_API_KEY no servidor para habilitar o resumo por IA.',
    }, { status: 503 });
  }

  let body: { pessoaId?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }
  const { pessoaId } = body;
  if (!pessoaId) return NextResponse.json({ ok: false, error: 'pessoaId é obrigatório' }, { status: 400 });

  // Coleta dos dados (RLS garante que o usuário só vê o que pode)
  const [pRes, reuRes, atvRes, ppRes] = await Promise.all([
    supabase.from('pessoas').select('*').eq('id', pessoaId).single(),
    supabase.from('reunioes').select('tipo, data_reuniao, relatorio').eq('pessoa_id', pessoaId).order('data_reuniao', { ascending: true }),
    supabase.from('atividades').select('tipo, descricao, data_atividade').eq('pessoa_id', pessoaId).order('data_atividade', { ascending: false }).limit(15),
    supabase.from('proximos_passos').select('descricao, data_prevista, feito').eq('pessoa_id', pessoaId).order('data_prevista', { ascending: true }),
  ]);

  const p = pRes.data as Record<string, unknown> | null;
  if (!p) return NextResponse.json({ ok: false, error: 'cliente não encontrado' }, { status: 404 });

  type Reu = { tipo: string; data_reuniao: string | null; relatorio: string | null };
  type Atv = { tipo: string; descricao: string | null; data_atividade: string | null };
  type Pp = { descricao: string; data_prevista: string | null; feito: boolean };
  const reunioes = (reuRes.data || []) as Reu[];
  const atividades = (atvRes.data || []) as Atv[];
  const passos = (ppRes.data || []) as Pp[];

  // Monta um dossiê textual compacto para a IA
  const linhas: string[] = [];
  linhas.push(`# Cliente: ${p.nome}`);
  linhas.push(`Fase: ${p.fase} · Status: ${p.status}`);
  if (p.empresa) linhas.push(`Empresa: ${p.empresa}`);
  linhas.push(`Cliente desde: ${fmt((p.data_fechamento as string) || (p.data_inicio as string) || null)}`);
  const cx = ['c1', 'c2', 'c3', 'c4'].filter(k => p[k]);
  linhas.push(`Consultorias fechadas: ${cx.length ? cx.map(c => c.toUpperCase()).join(', ') : 'nenhuma'}`);
  if (p.patrimonio) linhas.push(`Patrimônio: R$ ${Number(p.patrimonio).toLocaleString('pt-BR')}`);
  if (p.renda_mensal) linhas.push(`Renda mensal: R$ ${Number(p.renda_mensal).toLocaleString('pt-BR')}`);
  if (p.perfil_risco) linhas.push(`Perfil de risco: ${p.perfil_risco}`);
  if (p.objetivo) linhas.push(`Objetivo: ${p.objetivo}`);
  if (p.notas) linhas.push(`Notas: ${p.notas}`);

  linhas.push('\n## Reuniões realizadas');
  if (reunioes.length === 0) linhas.push('(nenhuma)');
  reunioes.forEach(r => {
    const label = TIPO_REUNIAO_LABEL[r.tipo as TipoReuniao] || r.tipo;
    linhas.push(`- ${label} em ${fmt(r.data_reuniao)}${r.relatorio ? `\n  Relatório: ${r.relatorio.slice(0, 600)}` : ''}`);
  });

  linhas.push('\n## Atividades recentes');
  if (atividades.length === 0) linhas.push('(nenhuma)');
  atividades.forEach(a => linhas.push(`- [${a.tipo}] ${fmt(a.data_atividade)}: ${a.descricao || ''}`));

  linhas.push('\n## Próximos passos');
  const abertos = passos.filter(s => !s.feito);
  if (abertos.length === 0) linhas.push('(nenhum em aberto)');
  abertos.forEach(s => linhas.push(`- ${s.descricao} (previsto ${fmt(s.data_prevista)})`));

  const dossie = linhas.join('\n');

  const prompt = `Você é um assistente de um consultor de planejamento financeiro (W1). Abaixo está o dossiê de um cliente do CRM.

Produza um resumo objetivo em português, com EXATAMENTE estas seções em markdown:

## Panorama
2-3 frases sobre quem é o cliente, onde está na jornada e o momento atual.

## Pontos de atenção
3 a 5 bullets curtos (riscos, oportunidades, sinais de esfriamento, lacunas de produto).

## Próxima ação recomendada
1 ação concreta e específica que o consultor deve tomar agora, com uma justificativa de uma linha.

Seja direto e prático. Não invente dados que não estão no dossiê; se algo não foi informado, ignore.

DOSSIÊ:
${dossie}`;

  const anthropic = new Anthropic({ apiKey });
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = msg.content.find(b => b.type === 'text');
    const resumo = textBlock && 'text' in textBlock ? textBlock.text : '';
    if (!resumo) return NextResponse.json({ ok: false, error: 'resposta vazia da IA' }, { status: 502 });
    return NextResponse.json({ ok: true, resumo });
  } catch (e: unknown) {
    const detail = e instanceof Error ? e.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: 'erro ao gerar resumo', detail }, { status: 502 });
  }
}
