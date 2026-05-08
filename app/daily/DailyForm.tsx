'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ETAPAS, TIPOS_BLOQUEIO, ACOES_BLOQUEIO } from '@/lib/constants';
import { supabase } from '@/lib/supabase';
import Icon from '@/components/Icon';
import AgendaSemanal from '@/components/AgendaSemanal';
import { FEATURES } from '@/lib/features';
import type { RegistroDaily } from '@/lib/types';

const METAS_BASE: Record<string, number> = { AA: 3, CA: 2, SA: 2, EA: 1, AF: 2, CF: 2, SF: 2, EF: 1, AP: 2, PP: 1, REC: 1 };

interface Props {
  userId: string;
  consultorNome: string;
  registroExistente: RegistroDaily | null;
  isLider: boolean;
}

export default function DailyForm({ userId, consultorNome, registroExistente, isLider }: Props) {
  const router = useRouter();
  const hoje = new Date().toISOString().slice(0, 10);

  const [valores, setValores] = useState<Record<string, { meta: number; real: number }>>(() => {
    if (registroExistente) {
      const v: Record<string, { meta: number; real: number }> = {};
      ETAPAS.forEach(et => {
        v[et] = {
          meta: Number((registroExistente as any)[`${et}_meta`]) || METAS_BASE[et],
          real: Number((registroExistente as any)[`${et}_real`]) || 0,
        };
      });
      return v;
    }
    const v: Record<string, { meta: number; real: number }> = {};
    ETAPAS.forEach(et => { v[et] = { meta: METAS_BASE[et], real: 0 }; });
    return v;
  });

  const [cttQuente, setCttQuente] = useState(registroExistente?.ctt_quente ?? 0);
  const [bloqueio, setBloqueio] = useState<string>(registroExistente?.bloqueio || 'Sem bloqueio');
  const [bloqueioDesc, setBloqueioDesc] = useState(registroExistente?.bloqueio_desc || '');
  const [ajuda, setAjuda] = useState<string>(registroExistente?.ajuda || 'Não');
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

  const showToast = (msg: string, isError?: boolean) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 4000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const payload: any = {
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
      payload[`${et}_meta`] = valores[et].meta;
      payload[`${et}_real`] = valores[et].real;
    });

    const { error } = await supabase
      .from('registros_daily')
      .upsert(payload, { onConflict: 'user_id,data' });

    setSaving(false);

    if (error) {
      console.error(error);
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
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div className="brand-logo" style={{ width: 44, height: 44, fontSize: 22 }}>🪣</div>
            <div>
              <div className="sec-eyebrow"><span className="eyebrow-dot"></span><span>Daily de hoje</span></div>
              <h1 style={{ margin: '4px 0 0', fontSize: 28, fontWeight: 700, letterSpacing: '-.02em' }}>
                Olá, {consultorNome}
              </h1>
            </div>
          </div>

          {isLider && (
            <button
              type="button"
              className="action-btn"
              onClick={() => router.push('/dashboard')}
            >
              <Icon name="dashboard" size={14} /> Ir para o Dashboard
            </button>
          )}
        </div>

        <form onSubmit={handleSubmit}>
          <div className="card" style={{ marginBottom: 16 }}>
            <div className="card-head">
              <h3>📊 Funil consultivo · meta vs real</h3>
            </div>
            <div className="form-grid">
              {ETAPAS.map(et => (
                <React.Fragment key={et}>
                  <div className="field">
                    <label>{et} Meta</label>
                    <input type="number" min="0" value={valores[et].meta} onChange={e => setValores({ ...valores, [et]: { ...valores[et], meta: parseInt(e.target.value) || 0 } })} />
                  </div>
                  <div className="field">
                    <label>{et} Real</label>
                    <input type="number" min="0" value={valores[et].real} onChange={e => setValores({ ...valores, [et]: { ...valores[et], real: parseInt(e.target.value) || 0 } })} />
                  </div>
                </React.Fragment>
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
                    onChange={e => { const n = [...bigPoints]; n[i] = e.target.value; setBigPoints(n); }}
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
                <input type="number" min="0" value={cttQuente} onChange={e => setCttQuente(parseInt(e.target.value) || 0)} />
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

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <button type="submit" className="action-btn primary" disabled={saving}>
              {saving ? 'Salvando...' : registroExistente ? '✓ Atualizar daily' : '✓ Salvar daily'}
            </button>
          </div>
        </form>

        {/* Agenda do próprio Google Calendar — só leitura, semana atual */}
        {FEATURES.GOOGLE_CALENDAR && (
          <div style={{ marginTop: 24 }}>
            <AgendaSemanal showHeader />
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}
    </div>
  );
}
