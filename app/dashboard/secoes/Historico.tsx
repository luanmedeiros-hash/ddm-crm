'use client';

import React from 'react';
import { calcIndice, regsValidos, fmtData, fmtDataBR, tipoDia } from '@/lib/calculos';
import { CONSULTORES } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';

interface Props {
  todosRegs: RegInterno[];
  dataRef: string;
  filtroConsultor: string;
}

export default function Historico({ todosRegs, dataRef, filtroConsultor }: Props) {
  const ref = new Date(dataRef + 'T12:00:00');
  // Gerar todos os dias do mês de referência
  const ano = ref.getFullYear(), mes = ref.getMonth();
  const ultimoDia = new Date(ano, mes + 1, 0).getDate();
  const diasMes: Date[] = [];
  for (let d = 1; d <= ultimoDia; d++) diasMes.push(new Date(ano, mes, d));

  const consultoresFiltro = filtroConsultor ? [filtroConsultor] : CONSULTORES.slice();

  return (
    <div className="card">
      <div className="card-head">
        <h3>📅 Heatmap de atingimento · {ref.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
      </div>

      <div className="heatmap-header">
        {diasMes.map(d => <div key={fmtData(d)} className="h">{d.getDate()}</div>)}
      </div>

      {consultoresFiltro.map(c => (
        <div key={c} className="heatmap-row">
          <div className="heatmap-name">{c}</div>
          <div className="heatmap-cells">
            {diasMes.map(d => {
              const td = tipoDia(d);
              if (td === 'fds') return <div key={fmtData(d)} className="heatmap-cell fds"><div className="tip">FDS</div></div>;
              const reg = regsValidos(todosRegs).find(r => r.data === fmtData(d) && r.consultor === c);
              if (!reg) return <div key={fmtData(d)} className="heatmap-cell empty"><div className="tip">{c} · {fmtDataBR(d)}<br />Sem preenchimento</div></div>;
              const indice = calcIndice([reg]).indice;
              let lvl = 0;
              if (indice >= 100) lvl = 5;
              else if (indice >= 80) lvl = 4;
              else if (indice >= 60) lvl = 3;
              else if (indice >= 30) lvl = 2;
              else if (indice > 0) lvl = 1;
              return <div key={fmtData(d)} className={`heatmap-cell lvl-${lvl}`}><div className="tip">{c} · {fmtDataBR(d)}<br />Índice: {indice.toFixed(0)}%</div></div>;
            })}
          </div>
        </div>
      ))}

      <div className="legend">
        <span>Escala:</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--bg-muted)' }}></span> Zerado</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(220,38,38,.35)' }}></span> &lt;30%</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(217,119,6,.4)' }}></span> 30-60%</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(51,65,85,.45)' }}></span> 60-80%</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'rgba(51,65,85,.7)' }}></span> 80-100%</span>
        <span className="legend-item"><span className="legend-dot" style={{ background: 'var(--primary)' }}></span> &gt;100%</span>
      </div>
    </div>
  );
}
