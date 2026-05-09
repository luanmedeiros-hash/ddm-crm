'use client';

import React, { useState } from 'react';
import { calcIndice, calcTendencia, classificar, fmtDataBRLong, gerarRecomendacao, regsValidos } from '@/lib/calculos';
import { isNovo } from '@/lib/constants';
import { PERFIS_DISC, DISC_CONFIG, PRAGMATICO_CONFIG } from '@/lib/disc';
import Avatar from './components/Avatar';
import StatusPill from './components/StatusPill';
import TrendArrow from './components/TrendArrow';
import FunnelDetail from './components/FunnelDetail';
import Icon from '@/components/Icon';
import type { RegInterno } from '@/lib/types';

interface Props {
  consultor: string;
  todosRegs: RegInterno[];
  range: string[];
  onClose: () => void;
}

type ModalTab = 'metricas' | 'perfil';

export default function ModalConsultor({ consultor, todosRegs, range, onClose }: Props) {
  const [modalTab, setModalTab] = useState<ModalTab>('metricas');
  const todos = regsValidos(todosRegs).filter(r => r.consultor === consultor);
  const regs = todos.filter(r => range.includes(r.data));
  const ult = regs.length ? [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] : null;

  const perfil = PERFIS_DISC[consultor];
  const disc = perfil ? DISC_CONFIG[perfil.disc] : null;
  const prag = perfil ? PRAGMATICO_CONFIG[perfil.pragmatico] : null;

  if (!ult) {
    return (
      <div className="modal-overlay" onClick={onClose}>
        <div className="modal-content" onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 600 }}>{consultor}</h2>
            <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
          </div>
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)' }}>Sem registros no período</div>
        </div>
      </div>
    );
  }

  const status = classificar(ult);
  const indice = calcIndice(regs).indice;
  const trend = calcTendencia(todos);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: 600 }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 0, paddingBottom: 16, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={consultor} variant={status === 'Crítico' ? 'crit' : 'green'} size="lg" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{consultor} {isNovo(consultor) && <span className="new-badge">NOVO</span>}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
                <StatusPill status={status} />
                <span>·</span>
                <strong style={{ color: 'var(--text)' }}>{indice.toFixed(0)}%</strong>
                <span>·</span>
                <TrendArrow trend={trend} />
                {disc && prag && (
                  <>
                    <span>·</span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: disc.corBg, color: disc.cor }}>
                      {disc.emoji} DISC {perfil!.disc}
                    </span>
                    <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 20, background: prag.corBg, color: prag.cor }}>
                      {prag.emoji} {perfil!.pragmatico}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

        {/* Tabs métricas / perfil */}
        <div style={{ display: 'flex', gap: 4, padding: '10px 0 14px' }}>
          <button
            onClick={() => setModalTab('metricas')}
            style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: modalTab === 'metricas' ? 700 : 500, background: modalTab === 'metricas' ? 'var(--primary)' : 'var(--bg-soft)', color: modalTab === 'metricas' ? '#fff' : 'var(--muted)', transition: 'all .15s' }}
          >
            📊 Métricas
          </button>
          {perfil && (
            <button
              onClick={() => setModalTab('perfil')}
              style={{ padding: '6px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontSize: 12.5, fontWeight: modalTab === 'perfil' ? 700 : 500, background: modalTab === 'perfil' ? (disc?.cor || 'var(--primary)') : 'var(--bg-soft)', color: modalTab === 'perfil' ? '#fff' : 'var(--muted)', transition: 'all .15s' }}
            >
              🧠 Perfil DISC
            </button>
          )}
        </div>

        {/* Tab: Métricas */}
        {modalTab === 'metricas' && (
          <>
            <FunnelDetail regs={regs} />
            {ult.prioridade && (
              <div style={{ marginTop: 18, padding: 14, background: 'var(--bg-soft)', borderRadius: 10 }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 8 }}>Prioridade atual</div>
                <div style={{ fontSize: 13, color: 'var(--text)' }}>{ult.prioridade}</div>
              </div>
            )}
            <div className="reco-block" style={{ marginTop: 14 }}>
              <div className="reco-eyebrow">Recomendação de gestão</div>
              <div className="reco-text" dangerouslySetInnerHTML={{ __html: gerarRecomendacao(ult, regs) }}></div>
            </div>
            {(ult.bigPoints || []).length > 0 && (
              <div className="bp-card" style={{ marginTop: 14 }}>
                <div className="bp-head">
                  <span className="bp-name">⭐ Big Points</span>
                  <span className={`bp-count ${(ult.bigPoints || []).length < 3 ? 'warn' : ''}`}>{(ult.bigPoints || []).length}/3</span>
                </div>
                <ul>{ult.bigPoints.map((b, i) => <li key={i}>{b}</li>)}</ul>
              </div>
            )}
          </>
        )}

        {/* Tab: Perfil DISC */}
        {modalTab === 'perfil' && perfil && disc && prag && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {/* Aviso */}
            <div style={{ padding: '8px 14px', borderRadius: 8, background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)', fontSize: 12, color: 'var(--muted)' }}>
              🔒 <strong style={{ color: 'var(--text)' }}>Confidencial — visível apenas para líderes.</strong>
            </div>

            {/* Descrição geral */}
            <div style={{ padding: 14, borderRadius: 10, background: disc.corBg, border: `1px solid ${disc.cor}25` }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: disc.cor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                {disc.emoji} {disc.titulo} · {prag.emoji} {perfil.pragmatico}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.6 }}>{perfil.descricao}</div>
            </div>

            {/* Fortes e atenção */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', marginBottom: 8 }}>✅ Fortes</div>
                <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {perfil.fortes.map((f, i) => <li key={i} style={{ fontSize: 12, color: 'var(--text)' }}>{f}</li>)}
                </ul>
              </div>
              <div style={{ padding: 12, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', marginBottom: 8 }}>⚠️ Atenção</div>
                <ul style={{ margin: 0, padding: '0 0 0 14px', display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {perfil.atencao.map((a, i) => <li key={i} style={{ fontSize: 12, color: 'var(--text)' }}>{a}</li>)}
                </ul>
              </div>
            </div>

            {/* Daily */}
            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: disc.cor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>☀️ Condução do Daily</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 7 }}>
                {perfil.conduta_daily.map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 18, height: 18, borderRadius: '50%', background: disc.cor, color: '#fff', fontSize: 10, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>{i + 1}</div>
                    <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>{item}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Feedback */}
            <div style={{ padding: 14, borderRadius: 10, background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>💬 Como Dar Feedback</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {perfil.feedback.map((item, i) => (
                  <div key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.5 }}>🎯 {item}</div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
