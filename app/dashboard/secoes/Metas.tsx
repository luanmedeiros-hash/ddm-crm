'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Perfil { id: string; nome: string; consultor_nome: string | null }
interface MetaRow { user_id: string; meta_analises: number; meta_consultorias: number; meta_fechamentos: number }
interface ReuniaoRow { pessoa_id: string; tipo: string; data_reuniao: string | null; user_id: string }
interface PessoaRow { id: string; fase: string; user_id: string; convertido_em: string | null }

function mesAtual() { return new Date().toISOString().slice(0, 7); }
function fmtMes(ym: string) {
  const [y, m] = ym.split('-');
  return new Date(Number(y), Number(m) - 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
}

export default function Metas() {
  const [mes, setMes] = useState(mesAtual());
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [metas, setMetas] = useState<Record<string, MetaRow>>({});
  const [reunioes, setReunioes] = useState<ReuniaoRow[]>([]);
  const [pessoas, setPessoas] = useState<PessoaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState<string | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: profs }, { data: ms }, { data: r }, { data: p }] = await Promise.all([
      supabase.from('profiles').select('id, nome, consultor_nome').eq('role', 'liderado').order('nome'),
      supabase.from('metas').select('user_id, meta_analises, meta_consultorias, meta_fechamentos').eq('mes', mes),
      supabase.from('reunioes').select('pessoa_id, tipo, data_reuniao, user_id'),
      supabase.from('pessoas').select('id, fase, user_id, convertido_em'),
    ]);
    setPerfis((profs as Perfil[]) || []);
    const mp: Record<string, MetaRow> = {};
    (ms as MetaRow[] || []).forEach(m => { mp[m.user_id] = m; });
    setMetas(mp);
    setReunioes((r as ReuniaoRow[]) || []);
    setPessoas((p as PessoaRow[]) || []);
    setLoading(false);
  }, [mes]);

  useEffect(() => { carregar(); }, [carregar]);

  // Realizados no mês, por consultor
  const realizados = useMemo(() => {
    const inicio = `${mes}-01`;
    const fim = `${mes}-31`;
    const noMes = (d: string | null) => d != null && d.slice(0, 10) >= inicio && d.slice(0, 10) <= fim;
    const map: Record<string, { analises: number; consultorias: number; fechamentos: number }> = {};
    const get = (uid: string) => (map[uid] ||= { analises: 0, consultorias: 0, fechamentos: 0 });
    for (const r of reunioes) {
      if (!noMes(r.data_reuniao)) continue;
      if (r.tipo === 'analise') get(r.user_id).analises++;
      else if (['c1', 'c2', 'c3', 'c4'].includes(r.tipo)) get(r.user_id).consultorias++;
    }
    for (const p of pessoas) {
      if (p.fase === 'cliente' && noMes(p.convertido_em)) get(p.user_id).fechamentos++;
    }
    return map;
  }, [reunioes, pessoas, mes]);

  // Previsão simples de fechamentos do mês
  const forecast = useMemo(() => {
    // Conversão histórica Análise → Cliente
    const comAnalise = new Set(reunioes.filter(r => r.tipo === 'analise').map(r => r.pessoa_id));
    const faseDe = new Map(pessoas.map(p => [p.id, p.fase]));
    const fecharam = [...comAnalise].filter(id => faseDe.get(id) === 'cliente').length;
    const conv = comAnalise.size ? fecharam / comAnalise.size : 0;
    // Análises do mês cujo lead ainda não fechou
    const inicio = `${mes}-01`, fim = `${mes}-31`;
    const analisesMesAbertas = reunioes.filter(r =>
      r.tipo === 'analise' && r.data_reuniao && r.data_reuniao.slice(0, 10) >= inicio && r.data_reuniao.slice(0, 10) <= fim
      && faseDe.get(r.pessoa_id) !== 'cliente'
    ).length;
    const fechadosMes = pessoas.filter(p => p.fase === 'cliente' && p.convertido_em && p.convertido_em.slice(0, 10) >= inicio && p.convertido_em.slice(0, 10) <= fim).length;
    return { conv: conv * 100, projecao: fechadosMes + Math.round(analisesMesAbertas * conv) };
  }, [reunioes, pessoas, mes]);

  const editar = (uid: string, campo: keyof Omit<MetaRow, 'user_id'>, valor: number) => {
    setMetas(prev => {
      const base = prev[uid] || { user_id: uid, meta_analises: 0, meta_consultorias: 0, meta_fechamentos: 0 };
      return { ...prev, [uid]: { ...base, user_id: uid, [campo]: valor } };
    });
  };

  const salvar = async (uid: string) => {
    setSalvando(uid);
    const m = metas[uid] || { user_id: uid, meta_analises: 0, meta_consultorias: 0, meta_fechamentos: 0 };
    await supabase.from('metas').upsert({
      user_id: uid, mes,
      meta_analises: m.meta_analises, meta_consultorias: m.meta_consultorias, meta_fechamentos: m.meta_fechamentos,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id,mes' });
    setSalvando(null);
  };

  const meses = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(); d.setMonth(d.getMonth() - i);
    return d.toISOString().slice(0, 7);
  });

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Mês + forecast */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Mês:</span>
          <select value={mes} onChange={e => setMes(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
            {meses.map(m => <option key={m} value={m}>{fmtMes(m)}</option>)}
          </select>
        </div>
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ ...card, padding: '10px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>🔮 Previsão de fechamentos</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: 'var(--primary)' }}>{forecast.projecao}</div>
          </div>
          <div style={{ ...card, padding: '10px 16px' }}>
            <div style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600 }}>📈 Conversão histórica</div>
            <div style={{ fontSize: 22, fontWeight: 800, color: '#a855f7' }}>{forecast.conv.toFixed(0)}%</div>
          </div>
        </div>
      </div>

      {/* Por consultor */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {perfis.map(p => {
          const m = metas[p.id] || { user_id: p.id, meta_analises: 0, meta_consultorias: 0, meta_fechamentos: 0 };
          const real = realizados[p.id] || { analises: 0, consultorias: 0, fechamentos: 0 };
          return (
            <div key={p.id} style={card}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                <div style={avatar}>{(p.consultor_nome || p.nome || '?')[0].toUpperCase()}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{p.consultor_nome || p.nome}</div>
                <button onClick={() => salvar(p.id)} disabled={salvando === p.id}
                  style={{ marginLeft: 'auto', padding: '5px 12px', borderRadius: 7, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer', opacity: salvando === p.id ? 0.6 : 1 }}>
                  {salvando === p.id ? '...' : 'Salvar metas'}
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
                <LinhaMeta label="🔍 Análises" real={real.analises} meta={m.meta_analises} onMeta={v => editar(p.id, 'meta_analises', v)} />
                <LinhaMeta label="🤝 Consultorias" real={real.consultorias} meta={m.meta_consultorias} onMeta={v => editar(p.id, 'meta_consultorias', v)} />
                <LinhaMeta label="🏆 Fechamentos" real={real.fechamentos} meta={m.meta_fechamentos} onMeta={v => editar(p.id, 'meta_fechamentos', v)} />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LinhaMeta({ label, real, meta, onMeta }: { label: string; real: number; meta: number; onMeta: (v: number) => void }) {
  const pct = meta > 0 ? Math.min((real / meta) * 100, 100) : 0;
  const atingiu = meta > 0 && real >= meta;
  return (
    <div style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 6 }}>{label}</div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 5, marginBottom: 6 }}>
        <span style={{ fontSize: 22, fontWeight: 800, color: atingiu ? '#15a34a' : 'var(--text)' }}>{real}</span>
        <span style={{ fontSize: 12, color: 'var(--muted)' }}>/</span>
        <input
          type="number" min="0" value={meta || ''}
          onChange={e => onMeta(parseInt(e.target.value) || 0)}
          placeholder="meta"
          style={{ width: 52, padding: '3px 6px', borderRadius: 6, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', fontSize: 13, fontWeight: 700 }}
        />
      </div>
      <div style={{ height: 5, background: 'var(--line)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: atingiu ? '#15a34a' : 'var(--primary)', borderRadius: 4, transition: 'width .4s' }} />
      </div>
    </div>
  );
}

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' };
const avatar: React.CSSProperties = { width: 32, height: 32, borderRadius: 999, flexShrink: 0, background: 'rgba(61,130,189,.15)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, fontWeight: 700 };
