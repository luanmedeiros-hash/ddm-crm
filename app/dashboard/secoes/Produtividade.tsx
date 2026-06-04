'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StatConsultor {
  nome: string;
  email: string;
  clientes_ativos: number;
  contatos_total: number;
  reunioes_mes: number;
  atividades_mes: number;
  proximos_pendentes: number;
  taxa_conversao: number; // contatos convertidos / total contatos
}

function fmtPct(n: number) { return n.toFixed(0) + '%'; }

function BarMini({ valor, max, cor }: { valor: number; max: number; cor: string }) {
  const pct = max > 0 ? Math.min((valor / max) * 100, 100) : 0;
  return (
    <div style={{ height: 4, background: 'var(--line)', borderRadius: 4, overflow: 'hidden', marginTop: 4 }}>
      <div style={{ height: '100%', width: `${pct}%`, background: cor, borderRadius: 4, transition: 'width .4s' }} />
    </div>
  );
}

export default function Produtividade() {
  const [stats, setStats] = useState<StatConsultor[]>([]);
  const [loading, setLoading] = useState(true);
  const [mesRef, setMesRef] = useState(() => new Date().toISOString().slice(0, 7)); // YYYY-MM

  const carregar = useCallback(async () => {
    setLoading(true);

    // 1. Busca todos os perfis de consultores
    const { data: perfis } = await supabase
      .from('profiles')
      .select('id, nome, email, role')
      .eq('role', 'liderado')
      .order('nome');

    if (!perfis?.length) { setStats([]); setLoading(false); return; }

    const inicioMes = `${mesRef}-01T00:00:00`;
    const fimMes = `${mesRef}-31T23:59:59`;

    // 2. Para cada consultor, busca os dados em paralelo
    const resultado: StatConsultor[] = await Promise.all(
      perfis.map(async (p) => {
        const [
          { count: clientesAtivos },
          { count: contatosTotal },
          { count: convertidos },
          { count: reunioesMes },
          { count: atividadesMes },
          { count: proximosPendentes },
        ] = await Promise.all([
          supabase.from('pessoas').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id).eq('fase', 'cliente').eq('status', 'ativo'),

          supabase.from('pessoas').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id).eq('fase', 'lead'),

          supabase.from('pessoas').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id).eq('fase', 'lead').eq('status', 'convertido'),

          supabase.from('reunioes').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('data_reuniao', inicioMes).lte('data_reuniao', fimMes),

          supabase.from('atividades').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id)
            .gte('data_atividade', inicioMes).lte('data_atividade', fimMes),

          supabase.from('proximos_passos').select('id', { count: 'exact', head: true })
            .eq('user_id', p.id).eq('feito', false),
        ]);

        const total = contatosTotal || 0;
        const conv = convertidos || 0;

        return {
          nome: p.nome || p.email,
          email: p.email,
          clientes_ativos: clientesAtivos || 0,
          contatos_total: total,
          reunioes_mes: reunioesMes || 0,
          atividades_mes: atividadesMes || 0,
          proximos_pendentes: proximosPendentes || 0,
          taxa_conversao: total > 0 ? (conv / total) * 100 : 0,
        };
      })
    );

    // Ordena por clientes ativos desc
    resultado.sort((a, b) => b.clientes_ativos - a.clientes_ativos);
    setStats(resultado);
    setLoading(false);
  }, [mesRef]);

  useEffect(() => { carregar(); }, [carregar]);

  const maxClientes = Math.max(...stats.map(s => s.clientes_ativos), 1);
  const maxReunioes = Math.max(...stats.map(s => s.reunioes_mes), 1);
  const maxAtividades = Math.max(...stats.map(s => s.atividades_mes), 1);

  // Meses disponíveis para seleção (últimos 6)
  const meses: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    meses.push(d.toISOString().slice(0, 7));
  }

  function fmtMes(ym: string) {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  return (
    <div>
      {/* Seletor de mês */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Mês de referência:</span>
        <select
          value={mesRef}
          onChange={e => setMesRef(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
        >
          {meses.map(m => (
            <option key={m} value={m}>{fmtMes(m)}</option>
          ))}
        </select>
        <button onClick={carregar} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' }}>
          ↺ Atualizar
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : stats.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum consultor encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map(s => (
            <div key={s.email} style={card}>
              {/* Nome */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={avatar}>{(s.nome || '?')[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.email}</div>
                </div>
              </div>

              {/* Grid de métricas */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <Metrica
                  label="Clientes ativos"
                  valor={s.clientes_ativos}
                  cor="#4a90c8"
                  max={maxClientes}
                  emoji="👥"
                />
                <Metrica
                  label={`Reuniões em ${fmtMes(mesRef).split(' ')[0]}`}
                  valor={s.reunioes_mes}
                  cor="#22c55e"
                  max={maxReunioes}
                  emoji="🤝"
                />
                <Metrica
                  label={`Atividades em ${fmtMes(mesRef).split(' ')[0]}`}
                  valor={s.atividades_mes}
                  cor="#F59E0B"
                  max={maxAtividades}
                  emoji="⚡"
                />
                <Metrica
                  label="Contatos na carteira"
                  valor={s.contatos_total}
                  cor="#6366f1"
                  emoji="📋"
                />
                <Metrica
                  label="Taxa de conversão"
                  valor={s.taxa_conversao}
                  cor="#a855f7"
                  emoji="🏆"
                  formato="pct"
                />
                <Metrica
                  label="Tarefas pendentes"
                  valor={s.proximos_pendentes}
                  cor={s.proximos_pendentes > 5 ? '#ef4444' : '#9ca3af'}
                  emoji="📌"
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metrica({
  label, valor, cor, max, emoji, formato,
}: {
  label: string;
  valor: number;
  cor: string;
  max?: number;
  emoji: string;
  formato?: 'pct';
}) {
  return (
    <div style={{ padding: '10px 12px', borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{emoji} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>
        {formato === 'pct' ? fmtPct(valor) : valor}
      </div>
      {max !== undefined && <BarMini valor={valor} max={max} cor={cor} />}
    </div>
  );
}

const card: React.CSSProperties = {
  padding: '16px 18px', borderRadius: 12,
  background: 'var(--bg-card)', border: '1px solid var(--line)',
};
const avatar: React.CSSProperties = {
  width: 36, height: 36, borderRadius: 999, flexShrink: 0,
  background: 'rgba(74,144,200,.15)', color: 'var(--primary)',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 15, fontWeight: 700,
};
