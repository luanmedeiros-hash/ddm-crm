'use client';

import React from 'react';
import type { Status } from '@/lib/types';

const MAP: Record<Status, string> = {
  'Normal': 'normal',
  'Atenção': 'atencao',
  'Crítico': 'critico',
  'Sem dados': 'semdados',
};

export default function StatusPill({ status }: { status: Status }) {
  return <span className={`pill ${MAP[status]}`}>{status}</span>;
}
