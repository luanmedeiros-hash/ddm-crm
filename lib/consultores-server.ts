import { getSupabaseServer } from './supabase-server';

/**
 * Busca a lista de nomes de consultores ATIVOS, ordenada por nome.
 * Fonte de verdade: tabela `consultores` (migration 006).
 *
 * Retorna apenas os nomes (string[]) para manter compatibilidade com o
 * formato antigo da constante CONSULTORES — assim as telas que esperam
 * uma lista de nomes continuam funcionando sem mudanca de formato.
 *
 * Em caso de erro (ou lista vazia), retorna [] — o chamador decide o
 * fallback (ex: usar a constante CONSULTORES como rede de seguranca).
 */
export async function getConsultoresAtivos(): Promise<string[]> {
  try {
    const supabase = await getSupabaseServer();
    const { data, error } = await supabase
      .from('consultores')
      .select('nome')
      .eq('ativo', true)
      .order('nome', { ascending: true });

    if (error) {
      console.error('[consultores-server] erro ao buscar consultores:', error.message);
      return [];
    }
    return (data || []).map((c: { nome: string }) => c.nome);
  } catch (e) {
    console.error('[consultores-server] excecao:', e);
    return [];
  }
}
