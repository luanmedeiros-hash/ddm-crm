'use client';

import React, { useMemo } from 'react';
import { calcIndice, calcTendencia, classificarConsultor, regsValidos } from '@/lib/calculos';
import { CONSULTORES, isNovo } from '@/lib/constants';
import StatusPill from '../components/StatusPill';
import TrendArrow from '../components/TrendArrow';
import type { RegInterno } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  todosRegs: RegInterno[];
  range: string[];
  onSelect: (nome: string) => void;
}

export default function Ranking({ filtered, todosRegs, range, onSelect }: Props) {
  const stats = useMemo(() => {
    return CONSULTORES.map(c => {
      const regs = filtered.filter(r => r.consultor === c);
      const allRegsConsultor = regsValidos(todosRegs).filter(r => r.consultor === c);
      const ind = calcIndice(regs).indice;
      const trend = calcTendencia(allRegsConsultor);
      const consist = Math.round((regs.length / Math.max(1, range.length)) * 100);
      const risco = classificarConsultor(regs);
      return {
        nome: c,
        indice: ind,
        aa: regs.reduce((s, r) => s + (r.AA?.real || 0), 0),
        af: regs.reduce((s, r) => s + (r.AF?.real || 0), 0),
        ap: regs.reduce((s, r) => s + (r.AP?.real || 0), 0),
        rec: regs.reduce((s, r) => s + (r.REC?.real || 0), 0),
        consist, risco, trend,
      };
    }).sort((a, b) => b.indice - a.indice);
  }, [filtered, todosRegs, range]);

  return (
    <div className="card">
      <div className="card-head">
        <h3>🔒 Ranking privado · clique para ver perfil</h3>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th><th>Consultor</th><th>Índice</th><th>AA</th><th>AF</th><th>AP</th><th>REC</th><th>Consist</th><th>Tendência</th><th>Status</th>
          </tr>
        </thead>
        <tbody>
          {stats.map((s, i) => (
            <tr key={s.nome} onClick={() => onSelect(s.nome)}>
              <td><span style={{ color: 'var(--primary)', fontWeight: 700 }}>{i + 1}º</span></td>
              <td>
                <div className="name-cell">
                  <div className="small-avatar">{s.nome.slice(0, 2).toUpperCase()}</div>
                  <span style={{ color: 'var(--text)', fontWeight: 600 }}>{s.nome}</span>
                  {isNovo(s.nome) && <span className="new-badge">NOVO</span>}
                </div>
              </td>
              <td><strong style={{ color: 'var(--text)' }}>{s.indice.toFixed(0)}%</strong></td>
              <td>{s.aa}</td>
              <td>{s.af}</td>
              <td><strong style={{ color: 'var(--primary)' }}>{s.ap}</strong></td>
              <td><strong style={{ color: 'var(--primary-bright)' }}>{s.rec}</strong></td>
              <td>{s.consist}%</td>
              <td><TrendArrow trend={s.trend} /></td>
              <td><StatusPill status={s.risco} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
