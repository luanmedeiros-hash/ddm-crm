'use client';

import React, { useState } from 'react';
import Alertas from './Alertas';
import BigPoints from './BigPoints';
import Bloqueios from './Bloqueios';
import type { RegInterno } from '@/lib/types';

type SubAba = 'alertas' | 'bigpoints' | 'bloqueios';

const SUB_ABAS: { key: SubAba; label: string; icon: string }[] = [
  { key: 'alertas',   label: 'Alertas',    icon: '⚠️' },
  { key: 'bigpoints', label: 'Big Points', icon: '⭐' },
  { key: 'bloqueios', label: 'Bloqueios',  icon: '🚧' },
];

interface Props {
  filtered: RegInterno[];
  consultoresPreencheram: Set<string>;
  dataAlvo: string;
  periodo: string;
  consultores: string[];
  onSelect: (nome: string) => void;
}

export default function Atencao({ filtered, consultoresPreencheram, dataAlvo, periodo, consultores, onSelect }: Props) {
  const [aba, setAba] = useState<SubAba>('alertas');

  return (
    <div>
      {/* Sub-navegação */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20, borderBottom: '1px solid var(--line)', paddingBottom: 0 }}>
        {SUB_ABAS.map(a => (
          <button
            key={a.key}
            onClick={() => setAba(a.key)}
            style={{
              padding: '8px 16px',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              fontSize: 13,
              fontWeight: 600,
              color: aba === a.key ? 'var(--primary)' : 'var(--muted)',
              borderBottom: `2px solid ${aba === a.key ? 'var(--primary)' : 'transparent'}`,
              marginBottom: -1,
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            <span>{a.icon}</span>
            {a.label}
          </button>
        ))}
      </div>

      {aba === 'alertas'   && <Alertas filtered={filtered} consultoresPreencheram={consultoresPreencheram} dataAlvo={dataAlvo} periodo={periodo} consultores={consultores} />}
      {aba === 'bigpoints' && <BigPoints filtered={filtered} onSelect={onSelect} />}
      {aba === 'bloqueios' && <Bloqueios filtered={filtered} />}
    </div>
  );
}
