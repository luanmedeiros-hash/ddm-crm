// lib/pendencias.ts
// Calcula as pendências reais do usuário (próximos passos vencidos/hoje
// e leads aguardando follow-up). Roda client-side com o supabase browser.

import { supabase } from '@/lib/supabase';

export interface Pendencia {
  id: string;
  tipo: 'proximo_passo' | 'lead_followup';
  titulo: string;
  pessoaId: string;
  pessoaNome: string;
  data: string | null;       // YYYY-MM-DD
  atrasoDias: number;        // >0 atrasado, 0 = hoje
}

function hojeISO(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
}

function diffAtraso(dataPrevista: string | null, hoje: string): number {
  if (!dataPrevista) return 0;
  const ms = new Date(hoje + 'T00:00:00').getTime() - new Date(dataPrevista + 'T00:00:00').getTime();
  return Math.round(ms / 86400000);
}

export async function buscarPendencias(): Promise<Pendencia[]> {
  const hoje = hojeISO();
  const lista: Pendencia[] = [];

  // 1. Próximos passos pendentes com data <= hoje
  const { data: passos } = await supabase
    .from('proximos_passos')
    .select('id, descricao, data_prevista, pessoa_id, pessoas(nome)')
    .eq('feito', false)
    .lte('data_prevista', hoje)
    .order('data_prevista', { ascending: true });

  (passos || []).forEach((p: Record<string, unknown>) => {
    const pessoa = p.pessoas as { nome?: string } | { nome?: string }[] | null;
    const nome = Array.isArray(pessoa) ? pessoa[0]?.nome : pessoa?.nome;
    lista.push({
      id: `passo-${p.id}`,
      tipo: 'proximo_passo',
      titulo: String(p.descricao || 'Próximo passo'),
      pessoaId: String(p.pessoa_id),
      pessoaNome: nome || 'Cliente',
      data: (p.data_prevista as string) || null,
      atrasoDias: diffAtraso((p.data_prevista as string) || null, hoje),
    });
  });

  // 2. Leads aguardando follow-up (proximo_contato <= hoje)
  const { data: leads } = await supabase
    .from('pessoas')
    .select('id, nome, proximo_contato, status')
    .eq('fase', 'lead')
    .lte('proximo_contato', hoje)
    .not('proximo_contato', 'is', null)
    .order('proximo_contato', { ascending: true });

  (leads || []).forEach((l: Record<string, unknown>) => {
    const status = String(l.status || '');
    if (status === 'convertido' || status === 'perdido') return;
    lista.push({
      id: `lead-${l.id}`,
      tipo: 'lead_followup',
      titulo: 'Retomar contato com lead',
      pessoaId: String(l.id),
      pessoaNome: String(l.nome || 'Lead'),
      data: (l.proximo_contato as string) || null,
      atrasoDias: diffAtraso((l.proximo_contato as string) || null, hoje),
    });
  });

  // Ordena: mais atrasados primeiro
  lista.sort((a, b) => b.atrasoDias - a.atrasoDias);
  return lista;
}
