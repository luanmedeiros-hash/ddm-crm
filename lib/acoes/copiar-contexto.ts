'use server';

import { getSupabaseServer } from '@/lib/supabase-server';

export async function montarContextoCliente(pessoaId: string): Promise<string> {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Nao autenticado');

  const { data: pessoa } = await supabase
    .from('pessoas')
    .select('nome, empresa, fase, status, contexto_rapido, tags, patrimonio, renda_mensal, perfil_risco, objetivo, produtos')
    .eq('id', pessoaId)
    .eq('user_id', user.id)
    .single();

  if (!pessoa) throw new Error('Cliente nao encontrado');

  const { data: reunioes } = await supabase
    .from('reunioes')
    .select('titulo, data, resumo, proximos_passos, prep_notes')
    .eq('pessoa_id', pessoaId)
    .order('data', { ascending: false })
    .limit(5);

  const { data: atividades } = await supabase
    .from('atividades')
    .select('tipo, descricao, data_atividade')
    .eq('pessoa_id', pessoaId)
    .order('data_atividade', { ascending: false })
    .limit(5);

  const { data: pendencias } = await supabase
    .from('pendencias')
    .select('descricao, prazo')
    .eq('pessoa_id', pessoaId)
    .eq('status', 'aberta')
    .order('prazo', { ascending: true });

  const { data: passos } = await supabase
    .from('proximos_passos')
    .select('descricao, data_prevista')
    .eq('pessoa_id', pessoaId)
    .eq('feito', false)
    .order('data_prevista', { ascending: true });

  const linhas: string[] = [];
  linhas.push('# Cliente: ' + pessoa.nome);
  if (pessoa.empresa) linhas.push('Empresa: ' + pessoa.empresa);
  linhas.push('Fase: ' + pessoa.fase + ' | Status: ' + pessoa.status);
  if (pessoa.tags && pessoa.tags.length) linhas.push('Tags: ' + pessoa.tags.join(', '));
  linhas.push('');

  if (pessoa.contexto_rapido) {
    linhas.push('## Contexto rapido');
    linhas.push(pessoa.contexto_rapido);
    linhas.push('');
  }

  const dados: string[] = [];
  if (pessoa.patrimonio) dados.push('Patrimonio: R$ ' + Number(pessoa.patrimonio).toLocaleString('pt-BR'));
  if (pessoa.renda_mensal) dados.push('Renda mensal: R$ ' + Number(pessoa.renda_mensal).toLocaleString('pt-BR'));
  if (pessoa.perfil_risco) dados.push('Perfil de risco: ' + pessoa.perfil_risco);
  if (pessoa.objetivo) dados.push('Objetivo: ' + pessoa.objetivo);
  if (pessoa.produtos && pessoa.produtos.length) dados.push('Produtos contratados: ' + pessoa.produtos.join(', '));
  if (dados.length) {
    linhas.push('## Dados financeiros');
    for (const d of dados) linhas.push('- ' + d);
    linhas.push('');
  }

  if (reunioes && reunioes.length) {
    linhas.push('## Ultimas reunioes');
    for (const r of reunioes) {
      linhas.push('');
      linhas.push('### ' + r.data + ' - ' + (r.titulo || 'Reuniao'));
      if (r.resumo) linhas.push('Resumo: ' + r.resumo);
      if (r.proximos_passos) linhas.push('Proximos passos: ' + r.proximos_passos);
    }
    linhas.push('');
  }

  if (atividades && atividades.length) {
    linhas.push('## Ultimas atividades');
    for (const a of atividades) {
      const dt = a.data_atividade.split('T')[0];
      linhas.push('- ' + dt + ' [' + a.tipo + '] ' + a.descricao);
    }
    linhas.push('');
  }

  if (pendencias && pendencias.length) {
    linhas.push('## Pendencias em aberto');
    for (const p of pendencias) {
      linhas.push('- ' + p.descricao + (p.prazo ? ' (prazo: ' + p.prazo + ')' : ''));
    }
    linhas.push('');
  }

  if (passos && passos.length) {
    linhas.push('## Proximos passos');
    for (const p of passos) {
      linhas.push('- ' + p.descricao + (p.data_prevista ? ' (prev: ' + p.data_prevista + ')' : ''));
    }
    linhas.push('');
  }

  linhas.push('---');
  linhas.push('');
  linhas.push('Sou consultor financeiro na W1 usando a metodologia GBI (Goals-Based Investing). Com base no contexto acima, [digite aqui sua pergunta especifica - ex.: me prepara um brief de 5 bullets pra call de amanha, focando no que mudou desde a ultima reuniao].');

  return linhas.join('\n');
}
