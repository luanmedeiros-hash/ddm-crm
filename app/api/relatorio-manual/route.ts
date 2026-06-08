// app/api/relatorio-manual/route.ts
// POST /api/relatorio-manual
// Body: { pessoaId, reuniaoId, tipo, transcricao, dataReuniao? }
// Gera relatório via Claude e salva/atualiza na tabela reunioes.
// Não depende de calendar_events — fluxo manual.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from '@/lib/supabase-server';
import { montarPrompt, TIPOS_REUNIAO, type TipoReuniao } from '@/lib/prompts-relatorio';
import { reportError } from '@/lib/log';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_api_key',
      message: 'Configure a ANTHROPIC_API_KEY no servidor para habilitar a geração de relatórios.',
    }, { status: 503 });
  }

  let body: { pessoaId?: string; reuniaoId?: string; tipo?: string; transcricao?: string; dataReuniao?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { pessoaId, reuniaoId, tipo, transcricao, dataReuniao } = body;

  if (!pessoaId || !tipo || !transcricao) {
    return NextResponse.json({ ok: false, error: 'pessoaId, tipo e transcricao são obrigatórios' }, { status: 400 });
  }
  if (!TIPOS_REUNIAO.includes(tipo as TipoReuniao)) {
    return NextResponse.json({ ok: false, error: 'tipo inválido' }, { status: 400 });
  }
  if (transcricao.trim().length < 50) {
    return NextResponse.json({ ok: false, error: 'Transcrição muito curta. Cole o texto completo da reunião.' }, { status: 400 });
  }

  const anthropic = new Anthropic({ apiKey });
  const prompt = montarPrompt(tipo as TipoReuniao, transcricao);

  let relatorio: string;
  try {
    const msg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      messages: [{ role: 'user', content: prompt }],
    });
    const textBlock = msg.content.find(b => b.type === 'text');
    relatorio = textBlock && 'text' in textBlock ? textBlock.text : '';
    if (!relatorio) {
      return NextResponse.json({ ok: false, error: 'resposta vazia da IA' }, { status: 502 });
    }
  } catch (e: unknown) {
    reportError('api.relatorio-manual', e, { pessoaId, tipo });
    const detail = e instanceof Error ? e.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: 'erro ao gerar relatório', detail }, { status: 502 });
  }

  const agora = new Date().toISOString();

  let upErr;
  if (reuniaoId) {
    ({ error: upErr } = await supabase
      .from('reunioes')
      .update({
        transcricao,
        relatorio,
        relatorio_gerado_em: agora,
        updated_at: agora,
      })
      .eq('id', reuniaoId));
  } else {
    ({ error: upErr } = await supabase
      .from('reunioes')
      .insert({
        pessoa_id: pessoaId,
        user_id: user.id,
        tipo,
        data_reuniao: dataReuniao || agora,
        transcricao,
        relatorio,
        relatorio_gerado_em: agora,
      }));
  }

  if (upErr) {
    return NextResponse.json({ ok: true, relatorio, warning: 'gerado mas não salvo: ' + upErr.message });
  }

  return NextResponse.json({ ok: true, relatorio });
}
