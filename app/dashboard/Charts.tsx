'use client';

import React, { useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import type { RegInterno } from '@/lib/types';
import { calcIndice, fmtDataBR } from '@/lib/calculos';
import { CONSULTORES } from '@/lib/constants';

Chart.register(...registerables);

interface Props {
  filtered: RegInterno[];
  range: string[];
}

export default function Charts({ filtered, range }: Props) {
  const ref1 = useRef<HTMLCanvasElement>(null);
  const ref2 = useRef<HTMLCanvasElement>(null);
  const ref3 = useRef<HTMLCanvasElement>(null);
  const charts = useRef<Record<string, Chart | null>>({});

  useEffect(() => {
    Object.values(charts.current).forEach(c => c?.destroy());
    charts.current = {};

    const baseOpts: any = {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: '#475569', font: { size: 11 } } },
        tooltip: { backgroundColor: '#0f172a', titleColor: '#fff', bodyColor: '#fff', borderWidth: 0 },
      },
      scales: {
        x: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' } },
        y: { ticks: { color: '#64748b', font: { size: 10 } }, grid: { color: 'rgba(0,0,0,.04)' }, beginAtZero: true },
      },
    };

    // Chart 1: índice por consultor
    const indices = CONSULTORES.map(c => ({ nome: c, ind: calcIndice(filtered.filter(r => r.consultor === c)).indice })).sort((a, b) => b.ind - a.ind);
    if (ref1.current) {
      charts.current.c1 = new Chart(ref1.current, {
        type: 'bar',
        data: {
          labels: indices.map(d => d.nome),
          datasets: [{
            label: 'Índice (%)',
            data: indices.map(d => d.ind),
            backgroundColor: indices.map(d => d.ind >= 80 ? '#0f172a' : d.ind >= 50 ? '#d97706' : '#dc2626'),
            borderRadius: 6,
          }],
        },
        options: baseOpts,
      });
    }

    // Chart 2: evolução AA/AF/AP/REC
    const evol = range.map(d => {
      const regs = filtered.filter(r => r.data === d);
      return {
        d: fmtDataBR(new Date(d + 'T12:00:00')),
        aa: regs.reduce((s, r) => s + (r.AA?.real || 0), 0),
        af: regs.reduce((s, r) => s + (r.AF?.real || 0), 0),
        ap: regs.reduce((s, r) => s + (r.AP?.real || 0), 0),
        rec: regs.reduce((s, r) => s + (r.REC?.real || 0), 0),
      };
    });
    if (ref2.current) {
      charts.current.c2 = new Chart(ref2.current, {
        type: 'line',
        data: {
          labels: evol.map(e => e.d),
          datasets: [
            { label: 'AA', data: evol.map(e => e.aa), borderColor: '#94a3b8', backgroundColor: 'rgba(148,163,184,.08)', tension: .35, fill: true, borderWidth: 2 },
            { label: 'AF', data: evol.map(e => e.af), borderColor: '#2563eb', backgroundColor: 'rgba(37,99,235,.08)', tension: .35, fill: true, borderWidth: 2 },
            { label: 'AP', data: evol.map(e => e.ap), borderColor: '#0f172a', backgroundColor: 'rgba(15,23,42,.12)', tension: .35, fill: true, borderWidth: 2.5 },
            { label: 'REC', data: evol.map(e => e.rec), borderColor: '#334155', backgroundColor: 'rgba(51,65,85,.1)', tension: .35, fill: true, borderWidth: 2 },
          ],
        },
        options: { ...baseOpts, plugins: { ...baseOpts.plugins, legend: { display: true, labels: { color: '#475569', font: { size: 11 }, usePointStyle: true } } } },
      });
    }

    // Chart 3: bloqueios por categoria
    const blqMap: Record<string, number> = {};
    filtered.filter(r => r.bloqueio !== 'Sem bloqueio').forEach(r => { blqMap[r.bloqueio] = (blqMap[r.bloqueio] || 0) + 1; });
    if (ref3.current && Object.keys(blqMap).length) {
      charts.current.c3 = new Chart(ref3.current, {
        type: 'doughnut',
        data: {
          labels: Object.keys(blqMap),
          datasets: [{
            data: Object.values(blqMap),
            backgroundColor: ['#0f172a', '#dc2626', '#d97706', '#2563eb', '#334155', '#7c3aed', '#94a3b8', '#b78a30'],
            borderColor: '#ffffff',
            borderWidth: 3,
          }],
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'right', labels: { color: '#475569', font: { size: 11 }, usePointStyle: true, padding: 12 } } } },
      });
    }

    return () => Object.values(charts.current).forEach(c => c?.destroy());
  }, [filtered, range]);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16 }}>
      <div className="charts-row">
        <div className="card">
          <div className="card-head"><h3>🚧 Bloqueios por categoria</h3></div>
          <div className="chart-wrap"><canvas ref={ref3}></canvas></div>
        </div>
        <div className="card">
          <div className="card-head"><h3>📈 Evolução · AA · AF · AP · REC</h3></div>
          <div className="chart-wrap"><canvas ref={ref2}></canvas></div>
        </div>
      </div>
      <div className="card">
        <div className="card-head"><h3>📊 Índice por consultor</h3></div>
        <div className="chart-wrap"><canvas ref={ref1}></canvas></div>
      </div>
    </div>
  );
}
