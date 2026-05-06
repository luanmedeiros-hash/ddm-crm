'use client';

import React from 'react';
import type { Tendencia } from '@/lib/types';

export default function TrendArrow({ trend }: { trend: Tendencia }) {
  if (trend.dir === 'up') return <span className="trend up">▲ +{trend.delta.toFixed(0)}%</span>;
  if (trend.dir === 'down') return <span className="trend down">▼ {trend.delta.toFixed(0)}%</span>;
  return <span className="trend flat">— estável</span>;
}
