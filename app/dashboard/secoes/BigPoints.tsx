'use client';

import React from 'react';
import { isNovo } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  onSelect: (nome: string) => void;
}

export default function BigPoints({ filtered, onSelect }: Props) {
  const map: Record<string, RegInterno> = {};
  filtered.forEach(r => {
    if (!map[r.consultor] || r.data > map[r.consultor].data) map[r.consultor] = r;
  });
  const arr = Object.values(map).sort((a, b) => (a.bigPoints || []).length - (b.bigPoints || []).length);

  return (
    <div className="card">
      <div className="card-head">
        <h3>⭐ Big Points · mínimo 3 por consultor por dia</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, marginTop: 10 }}>
        {arr.length === 0 ? (
          <div style={{ padding: 24, color: 'var(--muted)', fontSize: 13 }}>Sem dados no período</div>
        ) : arr.map(r => {
          const bps = r.bigPoints || [];
          const cls = bps.length === 0 ? 'crit' : bps.length < 3 ? 'warn' : '';
          return (
            <div key={r.consultor} className={`bp-card ${cls}`} onClick={() => onSelect(r.consultor)} style={{ cursor: 'pointer' }}>
              <div className="bp-head">
                <span className="bp-name">{r.consultor}{isNovo(r.consultor) && <span className="new-badge">NOVO</span>}</span>
                <span className={`bp-count ${cls}`}>{bps.length}/3 BPs</span>
              </div>
              {bps.length ? (
                <ul>{bps.map((b, i) => <li key={i}>{b}</li>)}</ul>
              ) : (
                <div style={{ fontSize: 11.5, color: 'var(--muted)', fontStyle: 'italic' }}>Sem Big Points</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
