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
      v[et] = Number((registroExistente as any)?.[et + '_meta']) || METAS_BASE[et];
    });
    return v;
  });

  const [reais, setReais] = useState<Record<string, number>>(() => {
    const v: Record<string, number> = {};
    ETAPAS.forEach(et => {
      v[et] = Number((registroExistente as any)?.[et + '_real']) || 0;
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
      payload[et + '_meta'] = metas[et];
      payload[et + '_real'] = reais[et];
    });

    const { error } = await supabase
      .from('registros_daily')
      .upsert(payload, { onConflict: 'user_id,data' });

    setSaving(false);

    if (error) {
      showToast('Erro ao salvar: ' + error.message, true);
    } else {
      showToast('Daily salva com sucesso!');
      setTimeout(() => router.push('/dashboard'), 1200);
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
          padding: '20px 28px',
          marginBottom: 24,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Daily Baldada</div>
            <div style={{ fontSize: 20, fontWeight: 700 }}>Ola, {consultorNome}</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginTop: 2 }}>{dataFormatada}</div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 4 }}>Progresso</div>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{aba === 'meta' ? progMeta : progReal}/11</div>
          </div>
        </div>

        {/* Abas */}
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          {(['meta', 'resultado'] as Aba[]).map(tab => (
            <button
              key={tab}
              onClick={() => setAba(tab)}
              style={{
                flex: 1, padding: '10px 16px', borderRadius: 10,
                border: '1.5px solid ' + (aba === tab ? 'var(--primary)' : 'var(--line)'),
                background: aba === tab ? 'var(--primary)' : 'var(--bg-soft)',
                color: aba === tab ? '#fff' : 'var(--text)',
                fontWeight: 700, fontSize: 14, cursor: 'pointer',
              }}
            >
              {tab === 'meta' ? 'Meta de hoje' : 'Resultado de ontem'}
              <span style={{ marginLeft: 8, opacity: 0.7, fontSize: 12 }}>
                ({tab === 'meta' ? progMeta : progReal}/11)
              </span>
            </button>
          ))}
        </div>

        {/* Barra de progresso */}
        <div style={{ height: 6, background: 'var(--line)', borderRadius: 4, marginBottom: 24, overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: ((aba === 'meta' ? progMeta : progReal) / 11 * 100) + '%',
            background: 'var(--primary)', borderRadius: 4, transition: 'width .3s',
          }} />
        </div>

        <form onSubmit={handleSubmit}>

          {/* ABA META */}
          {aba === 'meta' && (
            <div>
              {/* Funil metas */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head"><span>Funil consultivo — metas de hoje</span></div>
                <div className="form-grid">
                  {ETAPAS.map(et => (
                    <div className="field" key={et}>
                      <label title={SIGNIFICADOS[et]}>{et}</label>
                      <input
                        type="number" min={0}
                        value={metas[et]}
                        onChange={e => setMetas(p => ({ ...p, [et]: Number(e.target.value) }))}
                        placeholder={String(METAS_BASE[et])}
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Big Points */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head"><span>Big Points do dia</span></div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {bigPoints.map((bp, i) => (
                    <input
                      key={i} type="text"
                      placeholder={'Big Point ' + (i + 1)}
                      value={bp}
                      onChange={e => setBigPoints(prev => { const n = [...prev]; n[i] = e.target.value; return n; })}
                      style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', fontSize: 14 }}
                    />
                  ))}
                </div>
              </div>

              {/* Confiança meta */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head"><span>Confianca para hoje</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {[1,2,3,4,5].map(n => (
                    <button
                      key={n} type="button"
                      onClick={() => setConfianca(n)}
                      style={{
                        flex: 1, padding: '10px', borderRadius: 8,
                        border: '1px solid ' + (confianca === n ? 'var(--primary)' : 'var(--line)'),
                        background: confianca === n ? 'var(--primary)' : 'var(--bg-soft)',
                        color: confianca === n ? '#fff' : 'var(--text)',
                        fontWeight: 700, fontSize: 15, cursor: 'pointer',
                      }}
                    >{n}</button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ABA RESULTADO */}
          {aba === 'resultado' && (
            <div>
              {/* Funil real */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head"><span>Funil consultivo — resultado de ontem</span></div>
                <div className="form-grid">
                  {ETAPAS.map(et => {
                    const meta = METAS_BASE[et] ?? 0;
                    const val = reais[et];
                    const ok = val >= meta;
                    return (
                      <div className="field" key={et}>
                        <label style={{ display: 'flex', justifyContent: 'space-between' }} title={SIGNIFICADOS[et]}>
                          <span>{et}</span>
                          {val > 0 && <span style={{ color: ok ? 'var(--ok)' : 'var(--crit)', fontWeight: 700 }}>{ok ? '✓' : '↓'}</span>}
                        </label>
                        <input
                          type="number" min={0}
                          value={val}
                          onChange={e => setReais(p => ({ ...p, [et]: Number(e.target.value) }))}
                          placeholder={String(meta)}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Status resultado */}
              <div className="card" style={{ marginBottom: 20 }}>
                <div className="card-head"><span>Status do dia</span></div>
                <div className="form-grid">
                  <div className="field">
                    <label>Contatos quentes</label>
                    <input type="number" min={0} value={cttQuente} onChange={e => setCttQuente(Number(e.target.value))} />
                  </div>
                  <div className="field">
                    <label>Precisa de ajuda?</label>
                    <select value={ajuda} onChange={e => setAjuda(e.target.value)}>
                      <option>Não</option><option>Sim</option>
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
                      <label>Descricao do bloqueio</label>
                      <input type="text" value={bloqueioDesc} onChange={e => setBloqueioDesc(e.target.value)} placeholder="Descreva o bloqueio..." />
                    </div>
                  )}
                  <div className="field span-4">
                    <label>Avanco do dia</label>
                    <input type="text" value={avanco} onChange={e => setAvanco(e.target.value)} placeholder="O que avancou hoje?" />
                  </div>
                  <div className="field span-4">
                    <label>Prioridade de amanha</label>
                    <input type="text" value={prioridade} onChange={e => setPrioridade(e.target.value)} placeholder="Principal foco para amanha?" />
                  </div>
                  <div className="field span-4">
                    <label>Observacoes</label>
                    <textarea rows={2} value={observacoes} onChange={e => setObservacoes(e.target.value)} placeholder="Observacoes gerais..." style={{ resize: 'vertical' }} />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Botao salvar */}
          <button
            type="submit"
            disabled={saving}
            className="action-btn primary"
            style={{ width: '100%', padding: '14px', fontSize: 16, fontWeight: 700, marginBottom: 16 }}
          >
            {saving ? 'Salvando...' : 'Salvar daily e ir para o dashboard'}
          </button>

        </form>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
            background: toast.isError ? 'var(--crit)' : 'var(--ok)',
            color: '#fff', padding: '12px 24px', borderRadius: 10, fontWeight: 600, fontSize: 14,
            boxShadow: '0 4px 20px rgba(0,0,0,.2)', zIndex: 1000,
          }}>
            {toast.msg}
          </div>
        )}

        {/* Agenda */}
        {FEATURES.CALENDAR_DAILY && <AgendaConsultor userId={userId} />}
      </div>
    </div>
  );
}
