'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ETAPAS, SIGNIFICADOS, TIPOS_BLOQUEIO, ACOES_BLOQUEIO } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import { FEATURES } from '@/lib/features';
import Icon from '@/components/Icon';
import AgendaConsultor from '@/components/AgendaConsultor';
import type { RegistroDaily } from '@/lib/types';

const METAS_BASE: Record<string, number> = {
  AA: 3, CA: 2, SA: 2, EA: 1,
  AF: 2, CF: 2, SF: 2, EF: 1,
  AP: 2, PP: 1, REC: 1,
};

type Aba = 'meta' | 'resultado';

interface Props {
  userId: string;
  consultorNome: string;
  registroExistente: RegistroDaily | null;
  isLider: boolean;
}

export default function DailyForm({ userId, consultorNome, registroExistente, isLider }: Props) {
  const router = useRouter();
  const hoje = new Date().toISOString().slice(0, 10);
  const dataFormatada = new Date().toLocaleDateString('pt-BR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  const [aba, setAba] = useState<Aba>('meta');

  const [metas, setMetas] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    ETAPAS.forEach(et => {
      v[et] = Number((registroExistente as any)?.[`${et}_meta`]) || METAS_BASE[et];
    });
    return v;
  });

  const [reais, setReais] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    ETAPAS.forEach(et => {
      v[et] = Number((registroExistente as any)?.[`${et}_real`]) || 0;
    });
    return v;
  });

  const [cttQuente, setCttQuente] = useState(registroExistente?.ctt_quente ?? 0);
  const [bloqueio, setBloqueio] = useState(registroExistente?.bloqueio || 'Sem bloqueio');
  const [bloqueioDesc, setBloqueioDesc] = useState(registroExistente?.bloqueio_desc || '');
  const [ajuda, setAjuda] = useState(registroExistente?.ajuda || 'Não');
  const [confianca, setConfianca] = useState(registroExistente?.confianca ?? 4);
  const [avanco, setAvanco] = useState(registroExistente?.avanco || '');
  const [prioridade, setPrioridade] = useState(registroExistente?.prioridade || '');
  const [bigPoints, setBigPoints] = useState(() => {
    const bps = registroExistente?.big_points || [];
    return [bps[0] || '', bps[1] || '', bps[2] || ''];
  });
  const [observacoes, setObservacoes] = useState(registroExistente?.observacoes || '');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const progMeta = ETAPAS.filter(et => metas[et] > 0).length;
  const progReal = ETAPAS.filter(et => reais[et] > 0).length;

  const showToast = (msg: string, isError?: boolean) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: Record<string, unknown> = {
      user_id: userId,
      data: hoje,
      consultor_nome: consultorNome,
      ctt_quente: cttQuente,
      bloqueio,
      bloqueio_desc: bloqueio !== 'Sem bloqueio' ? bloqueioDesc : '',
      ajuda,
      confianca,
      avanco,
      prioridade,
      big_points: bigPoints.filter(b => b.trim()),
      observacoes,
    };
    ETAPAS.forEach(et => {
      payload[`${et}_meta`] = metas[et];
      payload[`${et}_real`] = reais[et];
    });

    const { error } = await supabase
      .from('registros_daily')
      .upsert(payload, { onConflict: 'user_id,data' });

    setSaving(false);

    if (error) {
      showToast(`Erro ao salvar: ${error.message}`, true);
    } else {
      showToast('✓ Daily salva com sucesso!');
      router.refresh();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg-page)', padding: '32px 20px' }}>
      <div style={{ maxWidth: 980, margin: '0 auto' }}>

        {/* Header */}
        <div style={{
          background: 'var(--primary)',
          color: '#fff',
          borderRadius: 14,
          padding: '20px 24px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 12, opacity: .65, textTransform: 'uppercase', letterSpacing: '.08em', marginBottom: 4 }}>
              Daily
            </div>
            <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: '-.02em' }}>
              Olá, {consultorNome}
            </h1>
            <div style={{ fontSize: 13, opacity: .6, marginTop: 4 }}>{dataFormatada}</div>
          </div>
          {isLider && (
            <button
              type="button"
              className="action-btn"
              onClick={() => router.push('/dashboard')}
              style={{
                background: 'rgba(255,255,255,.15)',
                border: '1px solid rgba(255,255,255,.3)',
                color: '#fff',
              }}
            >
              <Icon name="dashboard" size={14} /> Dashboard
            </button>
          )}
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['meta', 'resultado'] as Aba[]).map(id => {
            const label = id === 'meta' ? '🎯 Meta de hoje' : '📊 Resultado de ontem';
            const active = aba === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => setAba(id)}
                style={{
                  flex: 1,
                  padding: '10px 16px',
                  borderRadius: 10,
                  border: active ? '2px solid var(--primary)' : '2px solid var(--line)',
                  background: active ? 'var(--primary)' : 'var(--bg-card)',
                  color: active ? '#fff' : 'var(--text)',
                  fontWeight: 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  transition: 'all .15s',
                }}
              >
                {label}
              </button>
            );
          })}
        </div>

        <form onSubmit={handleSubmit}>

          {/* ── ABA META ── */}
          {aba === 'meta' && (
            <>
              <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Progresso das metas</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--primary)' }}>
                    {progMeta} / {ETAPAS.length}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(progMeta / ETAPAS.length) * 100}%`,
                    background: 'var(--primary)',
                    borderRadius: 99,
                    transition: 'width .3s',
                  }} />
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <h3>📈 Meta de etapas · o que planejo hoje</h3>
                </div>
                <div className="form-grid">
                  {ETAPAS.map(et => (
                    <div key={et} className="field">
                      <label title={SIGNIFICADOS[et]}>{et}</label>
                      <input
                        type="number"
                        min="0"
                        value={metas[et]}
                        onChange={e => setMetas({ ...metas, [et]: parseInt(e.target.value) || 0 })}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <h3>🎯 Big Points do dia · mínimo 3</h3>
                </div>
                <div className="form-grid">
                  {bigPoints.map((bp, i) => (
                    <div key={i} className="field span-4">
                      <label>Big Point {i + 1}</label>
                      <input
                        type="text"
                        value={bp}
                        onChange={e => {
                          const n = [...bigPoints];
                          n[i] = e.target.value;
                          setBigPoints(n);
                        }}
                        placeholder="Ex: Cotar seguro do cliente João"
                      />
                    </div>
                  ))}
                  <div className="field span-4">
                    <label>Prioridade do dia</label>
                    <input
                      type="text"
                      value={prioridade}
                      onChange={e => setPrioridade(e.target.value)}
                      placeholder="Ex: Reunião de fechamento às 15h"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── ABA RESULTADO ── */}
          {aba === 'resultado' && (
            <>
              <div className="card" style={{ marginBottom: 16, padding: '14px 20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-dim)' }}>Etapas registradas</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--ok)' }}>
                    {progReal} / {ETAPAS.length}
                  </span>
                </div>
                <div style={{ height: 8, background: 'var(--line)', borderRadius: 99, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%',
                    width: `${(progReal / ETAPAS.length) * 100}%`,
                    background: 'var(--ok)',
                    borderRadius: 99,
                    transition: 'width .3s',
                  }} />
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <h3>📊 Resultado de ontem · real vs meta</h3>
                </div>
                <div className="form-grid">
                  {ETAPAS.map(et => {
                    const val = reais[et];
                    const metaBase = METAS_BASE[et];
                    const preenchido = val > 0;
                    const atingiu = val >= metaBase;
                    return (
                      <div key={et} className="field">
                        <label title={SIGNIFICADOS[et]} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                          {et}
                          {preenchido && (
                            <span style={{
                              fontSize: 11,
                              fontWeight: 700,
                              color: atingiu ? 'var(--ok)' : 'var(--crit)',
                            }}>
                              {atingiu ? '✓' : '↓'}
                            </span>
                          )}
                        </label>
                        <input
                          type="number"
                          min="0"
                          value={val}
                          onChange={e => setReais({ ...reais, [et]: parseInt(e.target.value) || 0 })}
                          style={{
                            borderColor: preenchido
                              ? atingiu ? 'var(--ok)' : 'var(--crit)'
                              : undefined,
                          }}
                        />
                        <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
                          meta: {metaBase}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="card" style={{ marginBottom: 16 }}>
                <div className="card-head">
                  <h3>🚦 Status</h3>
                </div>
                <div className="form-grid">
                  <div className="field">
                    <label>Confiança (1-5)</label>
                    <select value={confianca} onChange={e => setConfianca(parseInt(e.target.value))}>
                      {[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}
                    </select>
                  </div>
                  <div className="field">
                    <label>Contatos quentes</label>
                    <input
                      type="number"
                      min="0"
                      value={cttQuente}
                      onChange={e => setCttQuente(parseInt(e.target.value) || 0)}
                    />
                  </div>
                  <div className="field">
                    <label>Precisa de ajuda?</label>
                    <select value={ajuda} onChange={e => setAjuda(e.target.value)}>
                      <option>Não</option>
                      <option>Sim</option>
                    </select>
                  </div>
                  <div className="field">
                    <label>Bloqueio</label>
                    <select value={bloqueio} onChange={e => setBloqueio(e.target.value)}>
                      {TIPOS_BLOQUEIO.map(t => <option key={t}>{t}</option>)}
                    </select>
                  </div>
                  {bloqueio !== 'Sem bloqueio' && (
                    <div className="field span-4">
                      <label>Descrição do bloqueio</label>
                      <input
                        type="text"
                        value={bloqueioDesc}
                        onChange={e => setBloqueioDesc(e.target.value)}
                        placeholder={ACOES_BLOQUEIO[bloqueio] || 'Descreva o bloqueio'}
                      />
                    </div>
                  )}
                  <div className="field span-4">
                    <label>Avanço do dia</label>
                    <input
                      type="text"
                      value={avanco}
                      onChange={e => setAvanco(e.target.value)}
                      placeholder="Ex: Cliente confirmou interesse na proposta"
                    />
                  </div>
                  <div className="field span-4">
                    <label>Observações</label>
                    <textarea value={observacoes} onChange={e => setObservacoes(e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button type="submit" className="action-btn primary" disabled={saving}>
              {saving ? 'Salvando...' : registroExistente ? '✓ Atualizar daily' : '✓ Salvar daily'}
            </button>
          </div>
        </form>

<<<<<<< HEAD
        {/* Agenda Google Calendar — sync manual + vinculação a leads */}
        {FEATURES.CALENDAR_DAILY && (
          <div style={{ marginTop: 28, padding: '20px 0 0', borderTop: '1px solid var(--line)' }}>
            <AgendaConsultor userId={userId} />
          </div>
        )}
=======
        {FEATURES.CALENDAR_DAILY && <AgendaConsultor consultorNome={consultorNome} isLider={isLider} />}
>>>>>>> ab38a8a (feat: DailyForm com abas Meta/Resultado usando CSS nativo)
      </div>

      {toast && (
        <div className={`toast${toast.isError ? ' error' : ''}`}>{toast.msg}</div>
      )}
    </div>
  );
}
