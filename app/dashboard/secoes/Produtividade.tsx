'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface StatConsultor {
  id: string;
  nome: string;
  email: string;
  clientes_ativos: number;
  contatos_total: number;
  convertidos: number;
  reunioes_mes: number;
  atividades_mes: number;
  proximos_pendentes: number;
  taxa_conversao: number;
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
  const [mesRef, setMesRef] = useState(() => new Date().toISOString().slice(0, 7));

  const carregar = useCallback(async () => {
    setLoading(true);

    const inicioMes = `${mesRef}-01T00:00:00`;
    const fimMes   = new Date(Number(mesRef.slice(0,4)), Number(mesRef.slice(5,7)), 0)
      .toISOString().slice(0, 10) + 'T23:59:59';

    // 1 query por tabela — busca todos os consultores de uma vez
    const [
      { data: perfis },
      { data: clientesAtivos },
      { data: contatosAll },
      { data: reunioesMes },
      { data: atividadesMes },
      { data: proximosPend },
    ] = await Promise.all([
      supabase.from('profiles').select('id, nome, email').eq('role', 'liderado').order('nome'),
      supabase.from('pessoas').select('user_id').eq('fase', 'cliente').eq('status', 'ativo'),
      supabase.from('pessoas').select('user_id, status').eq('fase', 'lead'),
      supabase.from('reunioes').select('user_id').gte('data_reuniao', inicioMes).lte('data_reuniao', fimMes),
      supabase.from('atividades').select('user_id').gte('data_atividade', inicioMes).lte('data_atividade', fimMes),
      supabase.from('proximos_passos').select('user_id').eq('feito', false),
    ]);

    if (!perfis?.length) { setStats([]); setLoading(false); return; }

    // Agrupa contagens por user_id no cliente
    const count = (arr: { user_id: string }[] | null, uid: string) =>
      (arr || []).filter(x => x.user_id === uid).length;

    const resultado: StatConsultor[] = perfis.map(p => {
      const total = count(contatosAll as { user_id: string }[], p.id);
      const conv  = (contatosAll || []).filter((x: { user_id: string; status: string }) => x.user_id === p.id && x.status === 'convertido').length;
      return {
        id:                 p.id,
        nome:               p.nome || p.email,
        email:              p.email,
        clientes_ativos:    count(clientesAtivos as { user_id: string }[], p.id),
        contatos_total:     total,
        convertidos:        conv,
        reunioes_mes:       count(reunioesMes as { user_id: string }[], p.id),
        atividades_mes:     count(atividadesMes as { user_id: string }[], p.id),
        proximos_pendentes: count(proximosPend as { user_id: string }[], p.id),
        taxa_conversao:     total > 0 ? (conv / total) * 100 : 0,
      };
    }).sort((a, b) => b.clientes_ativos - a.clientes_ativos);

    setStats(resultado);
    setLoading(false);
  }, [mesRef]);

  useEffect(() => { carregar(); }, [carregar]);

  const maxClientes   = Math.max(...stats.map(s => s.clientes_ativos), 1);
  const maxReunioes   = Math.max(...stats.map(s => s.reunioes_mes), 1);
  const maxAtividades = Math.max(...stats.map(s => s.atividades_mes), 1);

  const meses: string[] = [];
  for (let i = 0; i < 6; i++) {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    meses.push(d.toISOString().slice(0, 7));
  }
  function fmtMes(ym: string) {
    const [y, m] = ym.split('-');
    return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
  }

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Mês:</span>
        <select
          value={mesRef}
          onChange={e => setMesRef(e.target.value)}
          style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}
        >
          {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
        </select>
        <button onClick={carregar} style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12.5, cursor: 'pointer' }}>
          ↺
        </button>
      </div>

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : stats.length === 0 ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum consultor encontrado.</div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {stats.map(s => (
            <div key={s.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={avatar}>{(s.nome || '?')[0].toUpperCase()}</div>
                <div>
                  <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{s.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>{s.email}</div>
                </div>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                <Metrica label="Clientes ativos"    valor={s.clientes_ativos}    cor="#4a90c8" max={maxClientes}   emoji="👥" />
                <Metrica label="Reuniões no mês"    valor={s.reunioes_mes}        cor="#22c55e" max={maxReunioes}   emoji="🤝" />
                <Metrica label="Atividades no mês"  valor={s.atividades_mes}      cor="#F59E0B" max={maxAtividades} emoji="⚡" />
                <Metrica label="Leads na carteira"  valor={s.contatos_total}      cor="#6366f1"                    emoji="📋" />
                <Metrica label="Taxa de conversão"  valor={s.taxa_conversao}      cor="#a855f7"                    emoji="🏆" formato="pct" />
                <Metrica label="Tarefas pendentes"  valor={s.proximos_pendentes}  cor={s.proximos_pendentes > 5 ? '#ef4444' : '#9ca3af'} emoji="📌" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Metrica({ label, valor, cor, max, emoji, formato }: { label: string; valor: number; cor: string; max?: number; emoji: string; formato?: 'pct' }) {
  return (
    <div style={{ padding: '9px 11px', borderRadius: 8, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, marginBottom: 3 }}>{emoji} {label}</div>
      <div style={{ fontSize: 20, fontWeight: 700, color: cor }}>{formato === 'pct' ? fmtPct(valor) : valor}</div>
      {max !== undefined && <BarMini valor={valor} max={max} cor={cor} />}
    </div>
  );
}

const card: React.CSSProperties = { padding: '14px 16px', borderRadius: 12, background: 'var(--bg-card)', border: '1px solid var(--line)' };
const avatar: React.CSSProperties = { width: 34, height: 34, borderRadius: 999, flexShrink: 0, background: 'rgba(74,144,200,.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 };
