'use client';

import React from 'react';

type Variant = 'gold' | 'violet' | 'crit' | 'green';
type Size = 'md' | 'lg';

interface Props {
  name: string;
  variant?: Variant;
  size?: Size;
}

export default function Avatar({ name, variant = 'gold', size = 'md' }: Props) {
  const ini = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = `${variant}`;
  if (size === 'lg') return <div className={`avatar-lg ${cls}`}>{ini}</div>;
  return <div className={`active-avatar ${cls}`}>{ini}</div>;
}
