'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';

const ETAPAS = [
  { tipo: 'analise', label: 'Análise', emoji: '🔍' },
  { tipo: 'c1',      label: 'C1',      emoji: '1️⃣' },
  { tipo: 'c2',      label: 'C2',      emoji: '2️⃣' },
  { tipo: 'c3',      label: 'C3',      emoji: '3️⃣' },
  { tipo: 'c4',      label: 'C4',      emoji: '4️⃣' },
] as const;

const CADENCIA_DIAS = 10;

interface ReuniaoRow { pessoa_id: string; tipo: string; data_reuniao: string | null; user_id: string }
interface PessoaRow { id: string; nome: string; fase: string; user_id: string }
interface Perfil { id: string; nome: string; consultor_nome: string | null }

function diasEntre(a: string, b: string) {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

export default function Funil({ isLider }: { isLider: boolean }) {
  const [reunioes, setReunioes] = useState<ReuniaoRow[]>([]);
  const [pessoas, setPessoas] = useState<PessoaRow[]>([]);
  const [perfis, setPerfis] = useState<Perfil[]>([]);
  const [consultorId, setConsultorId] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const [{ data: r }, { data: p }, { data: profs }] = await Promise.all([
      supabase.from('reunioes').select('pessoa_id, tipo, data_reuniao, user_id'),
      supabase.from('pessoas').select('id, nome, fase, user_id'),
      isLider ? supabase.from('profiles').select('id, nome, consultor_nome').eq('role', 'liderado').order('nome') : Promise.resolve({ data: [] }),
    ]);
    setReunioes((r as ReuniaoRow[]) || []);
    setPessoas((p as PessoaRow[]) || []);
    setPerfis((profs as Perfil[]) || []);
    setLoading(false);
  }, [isLider]);

  useEffect(() => { carregar(); }, [carregar]);

  const dados = useMemo(() => {
    const reunFiltradas = consultorId ? reunioes.filter(r => r.user_id === consultorId) : reunioes;
    const pessoaFase = new Map(pessoas.map(p => [p.id, p.fase]));
    const pessoaNome = new Map(pessoas.map(p => [p.id, p.nome]));

    // Por pessoa: data mais antiga de cada etapa
    const porPessoa = new Map<string, Record<string, string>>();
    for (const r of reunFiltradas) {
      if (!r.data_reuniao) continue;
      const idx = ETAPAS.findIndex(e => e.tipo === r.tipo);
      if (idx === -1) continue;
      if (!porPessoa.has(r.pessoa_id)) porPessoa.set(r.pessoa_id, {});
      const m = porPessoa.get(r.pessoa_id)!;
      const d = r.data_reuniao.slice(0, 10);
      if (!m[r.tipo] || d < m[r.tipo]) m[r.tipo] = d;
    }

    // Maior etapa atingida por pessoa
    const maxIdx = new Map<string, number>();
    for (const [pid, etapas] of porPessoa) {
      let mx = -1;
      ETAPAS.forEach((e, i) => { if (etapas[e.tipo]) mx = Math.max(mx, i); });
      maxIdx.set(pid, mx);
    }

    // Funil: alcançou ao menos a etapa i
    const alcancou = ETAPAS.map((_, i) => {
      let n = 0;
      for (const mx of maxIdx.values()) if (mx >= i) n++;
      return n;
    });

    // Conversão Análise → fechamento (virou cliente)
    const comAnalise = [...maxIdx.keys()].filter(pid => (porPessoa.get(pid) || {}).analise);
    const fecharam = comAnalise.filter(pid => pessoaFase.get(pid) === 'cliente');
    const taxaFechamento = comAnalise.length ? (fecharam.length / comAnalise.length) * 100 : 0;

    // Tempo médio entre etapas
    const tempos = ETAPAS.slice(0, -1).map((e, i) => {
      const prox = ETAPAS[i + 1];
      const difs: number[] = [];
      for (const etapas of porPessoa.values()) {
        if (etapas[e.tipo] && etapas[prox.tipo]) {
          const d = diasEntre(etapas[e.tipo], etapas[prox.tipo]);
          if (d >= 0) difs.push(d);
        }
      }
      const media = difs.length ? difs.reduce((a, b) => a + b, 0) / difs.length : null;
      return { de: e.label, para: prox.label, media, n: difs.length };
    });

    // Estagnados: clientes que não chegaram ao C4 e estão atrasados na cadência
    const hoje = new Date().toISOString().slice(0, 10);
    const estagnados: { nome: string; etapaAtual: string; proxima: string; atraso: number }[] = [];
    for (const [pid, mx] of maxIdx) {
      if (mx < 0 || mx >= ETAPAS.length - 1) continue;
      if (pessoaFase.get(pid) !== 'cliente') continue;
      const etapas = porPessoa.get(pid)!;
      const ultimaData = etapas[ETAPAS[mx].tipo];
      const atraso = diasEntre(ultimaData, hoje) - CADENCIA_DIAS;
      if (atraso > 0) {
        estagnados.push({
          nome: pessoaNome.get(pid) || 'Cliente',
          etapaAtual: ETAPAS[mx].label,
          proxima: ETAPAS[mx + 1].label,
          atraso,
        });
      }
    }
    estagnados.sort((a, b) => b.atraso - a.atraso);

    return { alcancou, taxaFechamento, fecharam: fecharam.length, comAnalise: comAnalise.length, tempos, estagnados };
  }, [reunioes, pessoas, consultorId]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>;

  const maxFunil = dados.alcancou[0] || 1;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Filtro de consultor */}
      {isLider && perfis.length > 0 && (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <span style={{ fontSize: 12.5, color: 'var(--muted)' }}>Consultor:</span>
          <select value={consultorId} onChange={e => setConsultorId(e.target.value)}
            style={{ padding: '7px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, cursor: 'pointer' }}>
            <option value="">Toda a equipe</option>
            {perfis.map(p => <option key={p.id} value={p.id}>{p.consultor_nome || p.nome}</option>)}
          </select>
        </div>
      )}

      {/* Cards de conversão */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12 }}>
        <CardKpi label="Análises realizadas" valor={dados.comAnalise} emoji="🔍" cor="var(--primary)" />
        <CardKpi label="Viraram cliente" valor={dados.fecharam} emoji="🏆" cor="#15a34a" />
        <CardKpi label="Conversão Análise→Cliente" valor={`${dados.taxaFechamento.toFixed(0)}%`} emoji="📈" cor="#a855f7" />
        <CardKpi label="Clientes estagnados" valor={dados.estagnados.length} emoji="⏳" cor={dados.estagnados.length > 0 ? '#dc2626' : '#9ca3af'} />
      </div>

      {/* Funil */}
      <div style={card}>
        <div style={tituloCard}>Funil da jornada</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {ETAPAS.map((e, i) => {
            const n = dados.alcancou[i];
            const pctLargura = (n / maxFunil) * 100;
            const conv = i > 0 && dados.alcancou[i - 1] > 0 ? (n / dados.alcancou[i - 1]) * 100 : null;
            return (
              <div key={e.tipo} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 70, fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>{e.emoji} {e.label}</div>
                <div style={{ flex: 1, height: 30, background: 'var(--bg-soft)', borderRadius: 7, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ height: '100%', width: `${pctLargura}%`, background: 'var(--primary)', borderRadius: 7, transition: 'width .5s', minWidth: 4 }} />
                  <span style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 12, fontWeight: 700, color: pctLargura > 12 ? '#fff' : 'var(--text)' }}>{n}</span>
                </div>
                <div style={{ width: 56, textAlign: 'right', fontSize: 11.5, color: conv !== null && conv < 60 ? '#d97706' : 'var(--muted)', fontWeight: 600 }}>
                  {conv !== null ? `${conv.toFixed(0)}%` : '—'}
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 8 }}>% = conversão em relação à etapa anterior</div>
      </div>

      {/* Tempo entre etapas */}
      <div style={card}>
        <div style={tituloCard}>Tempo médio entre etapas <span style={{ fontWeight: 400, color: 'var(--muted)' }}>(meta: {CADENCIA_DIAS} dias)</span></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 10 }}>
          {dados.tempos.map(t => {
            const atrasado = t.media !== null && t.media > CADENCIA_DIAS;
            return (
              <div key={`${t.de}-${t.para}`} style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-soft)', border: `1px solid ${atrasado ? 'rgba(217,119,6,.35)' : 'var(--line)'}` }}>
                <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600 }}>{t.de} → {t.para}</div>
                <div style={{ fontSize: 19, fontWeight: 800, color: atrasado ? '#d97706' : 'var(--text)', marginTop: 2 }}>
                  {t.media !== null ? `${t.media.toFixed(0)}d` : '—'}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)' }}>{t.n} cliente{t.n !== 1 ? 's' : ''}</div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Estagnados */}
      <div style={card}>
        <div style={tituloCard}>Clientes estagnados na jornada</div>
        {dados.estagnados.length === 0 ? (
          <div style={{ padding: '14px 0', color: 'var(--muted)', fontSize: 13 }}>✅ Nenhum cliente atrasado na cadência.</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {dados.estagnados.map((s, i) => (
              <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 11px', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <span style={{ fontSize: 15 }}>⏳</span>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{s.nome}</div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>Parou após {s.etapaAtual} · falta {s.proxima}</div>
                </div>
                <span style={{ fontSize: 11.5, fontWeight: 700, color: '#dc2626', whiteSpace: 'nowrap' }}>{s.atraso}d atrasado</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function CardKpi({ label, valor, emoji, cor }: { label: string; valor: number | string; emoji: string; cor: string }) {
  return (
    <div style={card}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{emoji} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: cor, letterSpacing: '-0.02em' }}>{valor}</div>
    </div>
  );
}

const card: React.CSSProperties = { background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' };
const tituloCard: React.CSSProperties = { fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 12 };
