'use client';

import React from 'react';
import type { RegInterno } from '@/lib/types';
import { ETAPAS, SIGNIFICADOS } from '@/lib/constants';

export default function FunnelDetail({ regs }: { regs: RegInterno[] }) {
  return (
    <div>
      <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.6px', marginBottom: 12 }}>
        Funil completo · realizado / meta
      </div>
      <div className="funnel-detail">
        {ETAPAS.map(et => {
          const meta = regs.reduce((s, r) => s + (r[et]?.meta || 0), 0);
          const real = regs.reduce((s, r) => s + (r[et]?.real || 0), 0);
          const pct = meta > 0 ? (real / meta) * 100 : 0;
          const cls = pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : meta > 0 ? 'crit' : 'empty';
          return (
            <div key={et} className={`stage ${cls}`} title={SIGNIFICADOS[et]}>
              <div className="lab">{et}</div>
              <div className="vals">
                <span className="real">{real}</span>
                <span className="meta-v">/{meta}</span>
              </div>
              <div className="pct">{meta > 0 ? `${pct.toFixed(0)}%` : '—'}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
