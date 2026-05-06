'use client';

import React from 'react';
import { calcConversoes } from '@/lib/calculos';
import { METRICAS_4 } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';

export default function Conversao({ filtered }: { filtered: RegInterno[] }) {
  const conv = calcConversoes(filtered);
  return (
    <div className="card">
      <div className="card-head">
        <h3>🔻 Conversão do funil consultivo · 4 métricas-chave</h3>
      </div>
      <div style={{ marginTop: 8 }}>
        {METRICAS_4.map(s => {
          const v = conv[s.key as keyof typeof conv] as number;
          const cls = v >= 70 ? 'ok' : v >= 40 ? 'warn' : 'crit';
          return (
            <div key={s.key} className="conv-row">
              <span className="conv-label">{s.key}</span>
              <div className="conv-bar-bg">
                <div className={`conv-bar-fill ${cls}`} style={{ width: `${Math.min(100, v)}%` }}></div>
              </div>
              <span className="conv-pct">{v.toFixed(0)}%</span>
              <span className="conv-detail">{s.desc}</span>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 16, padding: 14, background: 'var(--bg-soft)', borderRadius: 10, border: '1px dashed var(--line)', fontSize: 12, color: 'var(--text-dim)' }}>
        <strong style={{ color: 'var(--text)' }}>Volumes brutos no período:</strong>{' '}
        AA = {conv.raw.aa} · AF = {conv.raw.af} · AP = {conv.raw.ap} · REC = {conv.raw.rec}
      </div>
    </div>
  );
}
