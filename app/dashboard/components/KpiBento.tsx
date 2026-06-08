'use client';

import React, { useMemo } from 'react';
import { calcIndice, calcConversoes, calcTendencia, regsValidos } from '@/lib/calculos';
import type { RegInterno, Tendencia } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  todosRegs: RegInterno[];
  consultores: string[];
  onGoTab: (tab: string) => void;
  isLider?: boolean;
}

function Delta({ trend, hero }: { trend: Tendencia; hero?: boolean }) {
  const arrow = trend.dir === 'up' ? '▲' : trend.dir === 'down' ? '▼' : '▬';
  const sinal = trend.delta > 0 ? '+' : '';
  return (
    <span className={`kpi-delta ${trend.dir}`}>
      {arrow} {sinal}{trend.delta.toFixed(0)}pp
    </span>
  );
}

export default function KpiBento({ filtered, todosRegs, consultores, onGoTab, isLider }: Props) {
  const m = useMemo(() => {
    const { indice } = calcIndice(filtered);
    const trend = calcTendencia(regsValidos(todosRegs));
    const conv = calcConversoes(filtered);
    const ativos = consultores.filter(c => filtered.some(r => r.consultor === c)).length;
    return {
      indice,
      trend,
      aa: conv.raw.aa,
      af: conv.raw.af,
      ap: conv.raw.ap,
      rec: conv.raw.rec,
      convE2E: conv['AA→AP'],
      ativos,
    };
  }, [filtered, todosRegs, consultores]);

  return (
    <div className="kpi-bento">
      <div className="kpi kpi-hero clickable" onClick={() => onGoTab('ranking')}>
        <div className="kpi-label">📈 Índice do período</div>
        <div className="kpi-value">{m.indice.toFixed(0)}<span className="unit">%</span></div>
        <div className="kpi-foot">
          <Delta trend={m.trend} hero /> vs. início do período
        </div>
      </div>

      <div className="kpi clickable" onClick={() => onGoTab('conversao')}>
        <div className="kpi-label">🎯 Agendadas</div>
        <div className="kpi-value">{m.aa.toFixed(0)}</div>
        <div className="kpi-foot">análises agendadas</div>
      </div>

      <div className="kpi clickable" onClick={() => onGoTab('conversao')}>
        <div className="kpi-label">✅ Feitas</div>
        <div className="kpi-value">{m.af.toFixed(0)}</div>
        <div className="kpi-foot">análises realizadas</div>
      </div>

      <div className="kpi clickable" onClick={() => onGoTab('funil')}>
        <div className="kpi-label">🔄 Conversão</div>
        <div className="kpi-value">{m.convE2E.toFixed(0)}<span className="unit">%</span></div>
        <div className="kpi-foot">agendada → paga</div>
      </div>

      <div className="kpi clickable" onClick={() => onGoTab('conversao')}>
        <div className="kpi-label">💰 Pagas</div>
        <div className="kpi-value">{m.ap.toFixed(0)}</div>
        <div className="kpi-foot">fechamentos</div>
      </div>

      <div className="kpi clickable" onClick={() => onGoTab('funil')}>
        <div className="kpi-label">⭐ Recomendações</div>
        <div className="kpi-value">{m.rec.toFixed(0)}</div>
        <div className="kpi-foot">geradas no período</div>
      </div>

      {isLider && (
        <div className="kpi clickable" onClick={() => onGoTab('produtividade')}>
          <div className="kpi-label">👥 Ativos</div>
          <div className="kpi-value">{m.ativos}<span className="unit">/{consultores.length}</span></div>
          <div className="kpi-foot">consultores</div>
        </div>
      )}
    </div>
  );
}
