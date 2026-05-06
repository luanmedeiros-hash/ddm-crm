'use client';

import React, { useMemo } from 'react';
import { ACOES_BLOQUEIO } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';

export default function Bloqueios({ filtered }: { filtered: RegInterno[] }) {
  const bloqueios = useMemo(() => {
    const map: Record<string, RegInterno> = {};
    filtered.filter(r => r.bloqueio !== 'Sem bloqueio').forEach(r => {
      if (!map[r.consultor] || r.data > map[r.consultor].data) map[r.consultor] = r;
    });
    return Object.values(map);
  }, [filtered]);

  return (
    <div className="card">
      <div className="card-head">
        <h3>🚧 Bloqueios ativos · {bloqueios.length}</h3>
      </div>
      {bloqueios.length === 0 ? (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>✓ Sem bloqueios no período</div>
      ) : (
        bloqueios.map((r, i) => (
          <div key={i} className="alert-row warn">
            <div className="alert-head">
              <span className="alert-title">{r.consultor} · {r.bloqueio}</span>
              <span className="alert-tag">Ativo</span>
            </div>
            <div className="alert-desc">{r.bloqueioDesc}</div>
            <div className="alert-who"><strong>Ação:</strong> {ACOES_BLOQUEIO[r.bloqueio] || 'Avaliar caso a caso'}</div>
          </div>
        ))
      )}
    </div>
  );
}
