'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// Tipos de reunião e rótulos (espelham lib/prompts-relatorio + fluxo de negócio)
const TIPO_LABEL: Record<string, string> = {
  analise: 'Análise',
  c1: 'C1',
  c2: 'C2',
  c3: 'C3',
  c4: 'C4',
  fechamento: 'Fechamento',
};

interface ReuniaoRow {
  id: string;
  tipo: string;
  data_reuniao: string | null;
  relatorio: string | null;
  relatorio_gerado_em: string | null;
  created_at?: string;
}

function fmtData(iso: string | null) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function TimelinePessoa({ pessoaId }: { pessoaId: string }) {
  const [reunioes, setReunioes] = useState<ReuniaoRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);
  const [copiado, setCopiado] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('reunioes')
      .select('id, tipo, data_reuniao, relatorio, relatorio_gerado_em, created_at')
      .eq('pessoa_id', pessoaId)
      .order('data_reuniao', { ascending: false, nullsFirst: false });
    if (error) {
      setErro(error.message);
    } else {
      setReunioes((data as ReuniaoRow[]) || []);
      setErro('');
    }
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const copiar = async (r: ReuniaoRow) => {
    if (!r.relatorio) return;
    try {
      await navigator.clipboard.writeText(r.relatorio);
      setCopiado(r.id);
      setTimeout(() => setCopiado(null), 1800);
    } catch {
      // silencioso
    }
  };

  return (
    <div style={{ marginTop: 18, paddingTop: 16, borderTop: '1px solid var(--line)' }}>
      <div style={labelStyle}>Histórico de reuniões</div>

      {loading ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '12px 0' }}>Carregando...</div>
      ) : erro ? (
        <div style={errorBox}>{erro}</div>
      ) : reunioes.length === 0 ? (
        <div style={{ fontSize: 12.5, color: 'var(--muted)', padding: '12px 0' }}>
          Nenhuma reunião registrada ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 10 }}>
          {reunioes.map(r => {
            const temRelatorio = !!r.relatorio;
            const expandido = aberto === r.id;
            return (
              <div key={r.id} style={linha}>
                <div
                  onClick={() => temRelatorio && setAberto(expandido ? null : r.id)}
                  style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: temRelatorio ? 'pointer' : 'default' }}
                >
                  <span style={tipoChip}>{TIPO_LABEL[r.tipo] || r.tipo}</span>
                  <span style={{ fontSize: 12.5, color: 'var(--text)' }}>{fmtData(r.data_reuniao)}</span>
                  <span style={{ flex: 1 }} />
                  {temRelatorio ? (
                    <span style={{ fontSize: 11, color: '#22c55e', fontWeight: 600 }}>
                      📄 Relatório {expandido ? '▲' : '▼'}
                    </span>
                  ) : (
                    <span style={{ fontSize: 11, color: 'var(--muted)' }}>sem relatório</span>
                  )}
                </div>

                {expandido && temRelatorio && (
                  <div style={{ marginTop: 10 }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 6 }}>
                      <button onClick={() => copiar(r)} style={btnCopiar}>
                        {copiado === r.id ? '✓ Copiado' : 'Copiar'}
                      </button>
                    </div>
                    <div style={relatorioBox}>{r.relatorio}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' };
const linha: React.CSSProperties = { padding: '10px 12px', borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--line)' };
const tipoChip: React.CSSProperties = { fontSize: 10.5, fontWeight: 700, padding: '2px 9px', borderRadius: 999, background: 'rgba(74,144,200,.1)', color: 'var(--primary)' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginTop: 10 };
const btnCopiar: React.CSSProperties = { padding: '4px 12px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11, fontWeight: 600 };
const relatorioBox: React.CSSProperties = { padding: '12px 14px', borderRadius: 8, background: 'var(--bg-card)', border: '1px solid var(--line)', color: 'var(--text)', fontSize: 12.5, lineHeight: 1.6, whiteSpace: 'pre-wrap', fontFamily: 'monospace', maxHeight: 360, overflowY: 'auto' };
