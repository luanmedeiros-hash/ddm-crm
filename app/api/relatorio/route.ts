// app/api/relatorio/route.ts
// POST /api/relatorio
// Body: { eventId: string, tipo: TipoReuniao, transcricao: string }
// Resolve a pessoa vinculada ao evento (calendar_events.lead_id),
// gera o relatório via Claude e salva em `reunioes` (ligado à pessoa).
// Marca o flag relatorio_gerado no calendar_events para a UI.

import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getSupabaseServer } from '@/lib/supabase-server';
import { montarPrompt, TIPOS_REUNIAO, type TipoReuniao } from '@/lib/prompts-relatorio';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });
  }

  // Valida API key
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json({
      ok: false,
      error: 'no_api_key',
      message: 'A geração de relatórios ainda não está ativada. Configure a ANTHROPIC_API_KEY no servidor.',
    }, { status: 503 });
  }

  // Valida body
  let body: { eventId?: string; tipo?: string; transcricao?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { eventId, tipo, transcricao } = body;
  if (!eventId || !tipo || !transcricao) {
    return NextResponse.json({ ok: false, error: 'eventId, tipo e transcricao são obrigatórios' }, { status: 400 });
  }
  if (!TIPOS_REUNIAO.includes(tipo as TipoReuniao)) {
    return NextResponse.json({ ok: false, error: 'tipo inválido' }, { status: 400 });
  }
  if (transcricao.trim().length < 50) {
    return NextResponse.json({ ok: false, error: 'Transcrição muito curta. Cole o texto completo da reunião.' }, { status: 400 });
  }

  // Confirma que o evento pertence ao usuário (ou que é líder)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  const isLider = profile?.role === 'lider';

  const { data: evento, error: evErr } = await supabase
    .from('calendar_events')
    .select('id, user_id, lead_id, start_at')
    .eq('id', eventId)
    .single();

  if (evErr || !evento) {
    return NextResponse.json({ ok: false, error: 'evento não encontrado' }, { status: 404 });
  }
  if (evento.user_id !== user.id && !isLider) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  // Precisa de uma pessoa vinculada para registrar a reunião
  if (!evento.lead_id) {
    return NextResponse.json({
      ok: false,
      error: 'no_pessoa',
      message: 'Vincule uma pessoa a este evento antes de gerar o relatório.',
    }, { status: 400 });
  }

  // Chama o Claude
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
    const detail = e instanceof Error ? e.message : 'erro desconhecido';
    return NextResponse.json({ ok: false, error: 'erro ao gerar relatório', detail }, { status: 502 });
  }

  const agora = new Date().toISOString();

  // Upsert em `reunioes`: uma linha por (evento + tipo).
  // Procura uma reunião existente com mesmo calendar_event_id e tipo.
  const { data: existente } = await supabase
    .from('reunioes')
    .select('id')
    .eq('calendar_event_id', eventId)
    .eq('tipo', tipo)
    .maybeSingle();

  let upErr;
  if (existente) {
    ({ error: upErr } = await supabase
      .from('reunioes')
      .update({
        transcricao,
        relatorio,
        relatorio_gerado_em: agora,
        data_reuniao: evento.start_at,
        updated_at: agora,
      })
      .eq('id', existente.id));
  } else {
    ({ error: upErr } = await supabase
      .from('reunioes')
      .insert({
        pessoa_id: evento.lead_id,
        tipo,
        data_reuniao: evento.start_at,
        calendar_event_id: eventId,
        transcricao,
        relatorio,
        relatorio_gerado_em: agora,
        user_id: user.id,
      }));
  }

  if (upErr) {
    // Relatório foi gerado mas não salvou — devolve mesmo assim pra não perder
    return NextResponse.json({ ok: true, relatorio, warning: 'gerado mas não salvo: ' + upErr.message });
  }

  // Marca o flag no evento para a UI mostrar o ✓ (sem duplicar o conteúdo)
  await supabase
    .from('calendar_events')
    .update({ relatorio_gerado: true, tipo_reuniao: tipo, relatorio_gerado_em: agora })
    .eq('id', eventId);

  return NextResponse.json({ ok: true, relatorio });
}
