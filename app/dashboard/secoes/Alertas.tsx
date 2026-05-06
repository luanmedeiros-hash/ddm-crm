'use client';

import React, { useMemo } from 'react';
import { calcIndice, fmtDataBR } from '@/lib/calculos';
import { CONSULTORES } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  consultoresPreencheram: Set<string>;
  dataAlvo: string;
  periodo: string;
}

interface AlertItem {
  lvl: 'crit' | 'warn' | 'info';
  t: string;
  d: string;
  who: string;
}

export default function Alertas({ filtered, consultoresPreencheram, dataAlvo, periodo }: Props) {
  const alerts = useMemo<AlertItem[]>(() => {
    const arr: AlertItem[] = [];
    if (periodo === 'diario') {
      CONSULTORES.forEach(c => {
        if (!consultoresPreencheram.has(c)) arr.push({ lvl: 'crit', t: 'Sem preenchimento hoje', d: `Não houve registro em ${fmtDataBR(new Date(dataAlvo))}`, who: c });
      });
    }
    CONSULTORES.forEach(c => {
      const regs = filtered.filter(r => r.consultor === c);
      if (!regs.length) return;
      const indice = calcIndice(regs).indice;
      if (indice < 40) arr.push({ lvl: 'crit', t: 'Índice crítico', d: `Atingimento médio de ${indice.toFixed(0)}% no período`, who: c });
      else if (indice < 60) arr.push({ lvl: 'warn', t: 'Índice abaixo do esperado', d: `Atingimento de ${indice.toFixed(0)}%`, who: c });
    });
    filtered.filter(r => (r.bigPoints || []).length < 3).forEach(r => {
      arr.push({ lvl: 'warn', t: `Big Points: ${(r.bigPoints || []).length}/3`, d: `Mínimo é 3/dia · ${fmtDataBR(new Date(r.data))}`, who: r.consultor });
    });
    filtered.filter(r => r.confianca <= 2).forEach(r => {
      arr.push({ lvl: 'crit', t: 'Baixa confiança', d: `Confiança ${r.confianca}/5 em ${fmtDataBR(new Date(r.data))}`, who: r.consultor });
    });
    filtered.filter(r => r.bloqueio !== 'Sem bloqueio').forEach(r => {
      arr.push({ lvl: 'warn', t: `Bloqueio: ${r.bloqueio}`, d: r.bloqueioDesc, who: r.consultor });
    });
    filtered.filter(r => r.ajuda === 'Sim').forEach(r => {
      arr.push({ lvl: 'crit', t: 'Pediu ajuda do gestor', d: 'Consultor solicita apoio', who: r.consultor });
    });
    const ordem: Record<string, number> = { crit: 0, warn: 1, info: 2 };
    arr.sort((a, b) => ordem[a.lvl] - ordem[b.lvl]);
    return arr.slice(0, 30);
  }, [filtered, consultoresPreencheram, dataAlvo, periodo]);

  return (
    <div className="card">
      <div className="card-head">
        <h3>⚠️ Alertas de gestão · {alerts.length}</h3>
      </div>
      {alerts.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>✓ Nenhum alerta no período</div>
      ) : (
        <div>
          {alerts.map((a, i) => (
            <div key={i} className={`alert-row ${a.lvl}`}>
              <div className="alert-head">
                <span className="alert-title">{a.t}</span>
                <span className="alert-tag">{a.lvl === 'crit' ? 'Crítico' : a.lvl === 'warn' ? 'Atenção' : 'Info'}</span>
              </div>
              <div className="alert-desc">{a.d}</div>
              <div className="alert-who">→ {a.who}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
