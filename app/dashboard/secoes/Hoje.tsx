'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa } from '@/lib/types';
import PerfilCliente from './PerfilCliente';

type PessoaRef = { id: string; nome: string; fase?: string | null };
type ReuniaoHoje = { id: string; titulo: string | null; data: string; prep_notes: string | null; pessoa: PessoaRef | null };
type AtividadeHoje = { id: string; tipo: string; descricao: string; data_atividade: string; pessoa: PessoaRef | null };
type PendenciaRow = { id: string; descricao: string; prazo: string | null; responsavel: 'consultor' | 'cliente'; pessoa_id: string; pessoa: PessoaRef | null };
type PassoRow = { id: string; descricao: string; data_prevista: string | null; responsavel: 'consultor' | 'cliente'; pessoa_id: string; pessoa: PessoaRef | null };

function ymd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const dia = String(d.getDate()).padStart(2, '0');
  return y + '-' + m + '-' + dia;
}
function hojeYMD(): string { return ymd(new Date()); }
function daquiADiasYMD(n: number): string { const d = new Date(); d.setDate(d.getDate() + n); return ymd(d); }
function formatarPrazo(iso: string | null): string { if (!iso) return ''; const [a, m, d] = iso.split('-'); return d + '/' + m + '/' + a; }

export default function Hoje() {
  const [loading, setLoading] = useState(true);
  const [reunioesHoje, setReunioesHoje] = useState<ReuniaoHoje[]>([]);
  const [pendHoje, setPendHoje] = useState<PendenciaRow[]>([]);
  const [passHoje, setPassHoje] = useState<PassoRow[]>([]);
  const [atividades, setAtividades] = useState<AtividadeHoje[]>([]);
  const [pendencias, setPendencias] = useState<PendenciaRow[]>([]);
  const [passos, setPassos] = useState<PassoRow[]>([]);
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setLoading(false); return; }

    const hoje = hojeYMD();
    const fimSemana = daquiADiasYMD(7);

    const { data: rH } = await supabase
      .from('reunioes')
      .select('id, titulo, data, prep_notes, pessoa:pessoas!inner(id, nome, fase, user_id)')
      .eq('pessoas.user_id', user.id).eq('data', hoje).order('data', { ascending: true });
    const rHoje = (rH ?? []) as unknown as ReuniaoHoje[];
    setReunioesHoje(rHoje);

    const ids = rHoje.map(r => r.pessoa?.id).filter(Boolean) as string[];
    if (ids.length > 0) {
      const [pH, nH] = await Promise.all([
        supabase.from('pendencias').select('id, descricao, prazo, responsavel, pessoa_id').in('pessoa_id', ids).eq('status', 'aberta'),
        supabase.from('proximos_passos').select('id, descricao, data_prevista, responsavel, pessoa_id').in('pessoa_id', ids).eq('feito', false),
      ]);
      setPendHoje((pH.data ?? []) as unknown as PendenciaRow[]);
      setPassHoje((nH.data ?? []) as unknown as PassoRow[]);
    } else { setPendHoje([]); setPassHoje([]); }

    const [aRes, pAtras, nSem] = await Promise.all([
      supabase.from('atividades').select('id, tipo, descricao, data_atividade, pessoa:pessoas!inner(id, nome, user_id)').eq('user_id', user.id).gte('data_atividade', hoje + 'T00:00:00').lte('data_atividade', hoje + 'T23:59:59').order('data_atividade', { ascending: false }),
      supabase.from('pendencias').select('id, descricao, prazo, responsavel, pessoa:pessoas!inner(id, nome, user_id)').eq('pessoas.user_id', user.id).eq('status', 'aberta').lt('prazo', hoje).order('prazo', { ascending: true }),
      supabase.from('proximos_passos').select('id, descricao, data_prevista, responsavel, pessoa:pessoas!inner(id, nome, user_id)').eq('user_id', user.id).eq('feito', false).gte('data_prevista', hoje).lte('data_prevista', fimSemana).order('data_prevista', { ascending: true }),
    ]);
    setAtividades((aRes.data ?? []) as unknown as AtividadeHoje[]);
    setPendencias((pAtras.data ?? []) as unknown as PendenciaRow[]);
    setPassos((nSem.data ?? []) as unknown as PassoRow[]);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  function tarefasDo(pid: string, quem: 'consultor' | 'cliente') {
    const a = pendHoje.filter(p => p.pessoa_id === pid && p.responsavel === quem).map(p => ({ id: 'p_' + p.id, descricao: p.descricao, data: p.prazo }));
    const b = passHoje.filter(p => p.pessoa_id === pid && p.responsavel === quem).map(p => ({ id: 'n_' + p.id, descricao: p.descricao, data: p.data_prevista }));
    return [...a, ...b];
  }

  async function abrirPessoa(id: string) {
    const { data } = await supabase.from('pessoas').select('*').eq('id', id).single();
    if (data) setPerfilAberto(data as Pessoa);
  }

  const S = {
    hero: { background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-bright) 100%)', borderRadius: 18, padding: '24px 28px', color: '#fff', boxShadow: 'var(--shadow-md)' } as React.CSSProperties,
    heroEye: { fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.75)', textTransform: 'uppercase', letterSpacing: '.8px', marginBottom: 4 } as React.CSSProperties,
    heroTit: { fontSize: 22, fontWeight: 700, color: '#fff', margin: '0 0 20px', letterSpacing: '-.02em' } as React.CSSProperties,
    heroList: { display: 'flex', flexDirection: 'column', gap: 14 } as React.CSSProperties,
    heroCard: { background: 'rgba(255,255,255,.10)', border: '1px solid rgba(255,255,255,.15)', borderRadius: 12, padding: '16px 18px', cursor: 'pointer', transition: '.15s' } as React.CSSProperties,
    heroNome: { fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' } as React.CSSProperties,
    heroSub: { display: 'flex', gap: 8, alignItems: 'center', marginTop: 4, fontSize: 12, color: 'rgba(255,255,255,.80)' } as React.CSSProperties,
    fase: { background: 'rgba(255,255,255,.20)', padding: '2px 8px', borderRadius: 4, fontSize: 10.5, fontWeight: 700, color: '#fff', textTransform: 'uppercase', letterSpacing: '.3px' } as React.CSSProperties,
    prep: { marginTop: 12, padding: '10px 12px', background: 'rgba(251, 191, 36, .18)', borderLeft: '3px solid #fbbf24', borderRadius: 8 } as React.CSSProperties,
    prepLab: { fontSize: 10, fontWeight: 700, color: '#fef3c7', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 } as React.CSSProperties,
    prepTxt: { margin: 0, color: '#fff', fontSize: 12.5, lineHeight: 1.5, whiteSpace: 'pre-wrap' } as React.CSSProperties,
    tarefas: { display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 14, paddingTop: 14, borderTop: '1px solid rgba(255,255,255,.15)' } as React.CSSProperties,
    tarLab: { fontSize: 10.5, fontWeight: 700, color: 'rgba(255,255,255,.85)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 } as React.CSSProperties,
    tarVazio: { color: 'rgba(255,255,255,.50)', fontSize: 12 } as React.CSSProperties,
    tarList: { listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 4 } as React.CSSProperties,
    tarItem: { fontSize: 12.5, color: 'rgba(255,255,255,.95)', lineHeight: 1.4, paddingLeft: 12, position: 'relative' } as React.CSSProperties,
    tarData: { color: 'rgba(255,255,255,.60)', fontSize: 11 } as React.CSSProperties,
    grid: { display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 16 } as React.CSSProperties,
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>;

  return (
    <>
      {reunioesHoje.length > 0 && (
        <div style={S.hero}>
          <div style={S.heroEye}>Prioridade agora</div>
          <h2 style={S.heroTit}>
            {reunioesHoje.length === 1 ? '1 reunião hoje' : reunioesHoje.length + ' reuniões hoje'}
          </h2>
          <div style={S.heroList}>
            {reunioesHoje.map(r => {
              const pid = r.pessoa?.id || '';
              const minhas = tarefasDo(pid, 'consultor');
              const dele = tarefasDo(pid, 'cliente');
              return (
                <div key={r.id} style={S.heroCard} onClick={() => pid && abrirPessoa(pid)}>
                  <div style={S.heroNome}>{r.pessoa?.nome ?? '—'}</div>
                  <div style={S.heroSub}>
                    {r.pessoa?.fase && <span style={S.fase}>{r.pessoa.fase}</span>}
                    {r.titulo && <span>{r.titulo}</span>}
                  </div>
                  {r.prep_notes && (
                    <div style={S.prep}>
                      <div style={S.prepLab}>Preparação</div>
                      <p style={S.prepTxt}>{r.prep_notes}</p>
                    </div>
                  )}
                  <div style={S.tarefas}>
                    <div>
                      <div style={S.tarLab}>Suas tarefas ({minhas.length})</div>
                      {minhas.length === 0 ? <div style={S.tarVazio}>—</div> : (
                        <ul style={S.tarList}>{minhas.map(t => (
                          <li key={t.id} style={S.tarItem}>
                            <span style={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,.6)' }}>•</span>
                            {t.descricao}
                            {t.data && <span style={S.tarData}> · {formatarPrazo(t.data)}</span>}
                          </li>
                        ))}</ul>
                      )}
                    </div>
                    <div>
                      <div style={S.tarLab}>Tarefas dele ({dele.length})</div>
                      {dele.length === 0 ? <div style={S.tarVazio}>—</div> : (
                        <ul style={S.tarList}>{dele.map(t => (
                          <li key={t.id} style={S.tarItem}>
                            <span style={{ position: 'absolute', left: 0, color: 'rgba(255,255,255,.6)' }}>•</span>
                            {t.descricao}
                            {t.data && <span style={S.tarData}> · {formatarPrazo(t.data)}</span>}
                          </li>
                        ))}</ul>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div style={S.grid}>
        <div className="card">
          <div className="card-head">
            <h3>Pendências atrasadas</h3>
            {pendencias.length > 0 ? <span className="pill critico">{pendencias.length}</span> : <span className="nav-badge count">0</span>}
          </div>
          {pendencias.length === 0 ? <div className="empty-state">Nada em atraso.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {pendencias.map(p => (
                <div key={p.id} className="alert-row crit" onClick={() => p.pessoa && abrirPessoa(p.pessoa.id)} style={{ cursor: 'pointer' }}>
                  <div className="alert-head">
                    <span className="alert-title">{p.descricao}</span>
                    <span className="alert-tag">venceu {formatarPrazo(p.prazo)}</span>
                  </div>
                  <div className="alert-who">{p.pessoa?.nome ?? '—'} · {p.responsavel === 'consultor' ? 'Você' : 'Cliente'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Próximos 7 dias</h3>
            <span className="nav-badge count">{passos.length}</span>
          </div>
          {passos.length === 0 ? <div className="empty-state">Sem próximos passos na semana.</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {passos.map(p => (
                <div key={p.id} className="alert-row info" onClick={() => p.pessoa && abrirPessoa(p.pessoa.id)} style={{ cursor: 'pointer' }}>
                  <div className="alert-head">
                    <span className="alert-title">{p.descricao}</span>
                    <span className="alert-tag">{formatarPrazo(p.data_prevista)}</span>
                  </div>
                  <div className="alert-who">{p.pessoa?.nome ?? '—'} · {p.responsavel === 'consultor' ? 'Você' : 'Cliente'}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>Atividades registradas hoje</h3>
            <span className="nav-badge count">{atividades.length}</span>
          </div>
          {atividades.length === 0 ? <div className="empty-state">Nada registrado ainda.</div> : (
            <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {atividades.map(a => (
                <li key={a.id} style={{ padding: '10px 12px', borderRadius: 9, background: 'var(--bg-soft)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--text)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 5, background: 'var(--bg-muted)', color: 'var(--text-dim)', fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px' }}>{a.tipo}</span>
                    <span style={{ fontSize: 12, color: 'var(--muted)' }}>{a.pessoa?.nome ?? '—'}</span>
                  </div>
                  <div style={{ color: 'var(--text-dim)', fontSize: 12.5, lineHeight: 1.5, marginTop: 6 }}>{a.descricao}</div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {perfilAberto && (
        <PerfilCliente cliente={perfilAberto} onClose={() => { setPerfilAberto(null); carregar(); }} />
      )}
    </>
  );
}
