'use client';

import React, { useMemo } from 'react';
import { calcIndice, calcTendencia, classificar, regsValidos } from '@/lib/calculos';
import { CONSULTORES, isNovo } from '@/lib/constants';
import Avatar from '../components/Avatar';
import StatusPill from '../components/StatusPill';
import TrendArrow from '../components/TrendArrow';
import FunnelDetail from '../components/FunnelDetail';
import Icon from '@/components/Icon';
import Charts from '../Charts';
import AgendaSemanal from '@/components/AgendaSemanal';
import { FEATURES } from '@/lib/features';
import type { RegInterno } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  range: string[];
  todosRegs: RegInterno[];
  onSelect: (nome: string) => void;
  onGoTab: (tab: string) => void;
  onRefresh: () => void;
  filtroConsultor?: string;
}

export default function Dashboard({ filtered, range, todosRegs, onSelect, onGoTab, onRefresh, filtroConsultor }: Props) {
  const top3 = useMemo(() => {
    return CONSULTORES.map(c => {
      const regs = filtered.filter(r => r.consultor === c);
      const ind = calcIndice(regs).indice;
      const trend = calcTendencia(regsValidos(todosRegs).filter(r => r.consultor === c));
      const status = regs.length ? classificar([...regs].sort((a, b) => b.data.localeCompare(a.data))[0]) : 'Sem dados';
      return { nome: c, indice: ind, trend, regs: regs.length, status };
    }).filter(s => s.regs > 0).sort((a, b) => b.indice - a.indice).slice(0, 3);
  }, [filtered, todosRegs]);

  return (
    <>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <div className="card-head">
            <h3>🏆 Top performers · período</h3>
            <div className="card-actions">
              <button title="Ver ranking completo" onClick={() => onGoTab('ranking')}><Icon name="rank" size={14} /></button>
            </div>
          </div>
          {top3.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sem dados no período</div>
          ) : (
            top3.map((c, i) => (
              <div key={c.nome} onClick={() => onSelect(c.nome)} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '12px 0', borderBottom: i < top3.length - 1 ? '1px solid var(--line)' : 'none', cursor: 'pointer' }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--primary)', minWidth: 30 }}>{i + 1}º</div>
                <Avatar name={c.nome} variant="green" />
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)' }}>{c.nome} {isNovo(c.nome) && <span className="new-badge">NOVO</span>}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 1 }}><StatusPill status={c.status} /></div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: 22, fontWeight: 300, color: 'var(--text)', letterSpacing: '-.02em' }}>{c.indice.toFixed(0)}<span style={{ fontSize: 13, color: 'var(--muted)' }}>%</span></div>
                  <div style={{ marginTop: 2 }}><TrendArrow trend={c.trend} /></div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="card">
          <div className="card-head">
            <h3>🔄 Funil completo · todas as etapas</h3>
            <div className="card-actions">
              <button title="Recarregar" onClick={onRefresh}><Icon name="refresh" size={14} /></button>
            </div>
          </div>
          <FunnelDetail regs={filtered} />
        </div>
      </div>

      <Charts filtered={filtered} range={range} />

      {/* Agenda embutida quando estiver vendo perfil individual */}
      {FEATURES.GOOGLE_CALENDAR && filtroConsultor && (
        <div style={{ marginTop: 16 }}>
          <AgendaSemanal consultor={filtroConsultor} showHeader />
        </div>
      )}
    </>
  );
}
