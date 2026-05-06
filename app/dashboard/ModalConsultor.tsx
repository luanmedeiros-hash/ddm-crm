'use client';

import React from 'react';
import { calcIndice, calcTendencia, classificar, fmtDataBRLong, gerarRecomendacao, regsValidos } from '@/lib/calculos';
import { isNovo } from '@/lib/constants';
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

export default function ModalConsultor({ consultor, todosRegs, range, onClose }: Props) {
  const todos = regsValidos(todosRegs).filter(r => r.consultor === consultor);
  const regs = todos.filter(r => range.includes(r.data));
  const ult = regs.length ? [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] : null;

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
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, paddingBottom: 18, borderBottom: '1px solid var(--line)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar name={consultor} variant={status === 'Crítico' ? 'crit' : 'green'} size="lg" />
            <div>
              <div style={{ fontSize: 22, fontWeight: 600 }}>{consultor} {isNovo(consultor) && <span className="new-badge">NOVO</span>}</div>
              <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4, display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusPill status={status} />
                <span>·</span>
                <strong style={{ color: 'var(--text)' }}>{indice.toFixed(0)}%</strong>
                <span>·</span>
                <TrendArrow trend={trend} />
              </div>
            </div>
          </div>
          <button className="icon-btn" onClick={onClose}><Icon name="close" size={16} /></button>
        </div>

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
      </div>
    </div>
  );
}
