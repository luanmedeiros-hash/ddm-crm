'use client';

import React from 'react';
import AgendaSemanal from '@/components/AgendaSemanal';

interface Props {
  filtroConsultor: string;
}

export default function Agenda({ filtroConsultor }: Props) {
  return (
    <div>
      <div style={{ marginBottom: 18 }}>
        <div className="sec-eyebrow">
          <span className="eyebrow-dot"></span>
          <span>Google Calendar · espelhamento read-only</span>
        </div>
        <h1 className="sec-title">
          {filtroConsultor ? `Agenda de ${filtroConsultor}` : 'Agenda da equipe'}
        </h1>
        <div className="sec-sub">
          {filtroConsultor
            ? `Reuniões da semana atual (segunda a domingo) do calendário Google de ${filtroConsultor}.`
            : 'Reuniões da semana atual de todos os consultores. Cada consultor precisa ter feito login com Google e compartilhado o calendar com você.'
          }
        </div>
      </div>

      <AgendaSemanal
        consultor={filtroConsultor || undefined}
        todos={!filtroConsultor}
        showHeader
      />
    </div>
  );
}
