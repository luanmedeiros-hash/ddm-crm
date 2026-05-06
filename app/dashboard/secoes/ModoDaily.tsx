'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { calcIndice, calcTendencia, classificar, fmtDataBR, fmtDataBRLong, gerarRecomendacao, regsValidos } from '@/lib/calculos';
import { CONSULTORES, isNovo } from '@/lib/constants';
import Avatar from '../components/Avatar';
import StatusPill from '../components/StatusPill';
import TrendArrow from '../components/TrendArrow';
import FunnelDetail from '../components/FunnelDetail';
import Icon from '@/components/Icon';
import type { RegInterno } from '@/lib/types';

interface Props {
  filtered: RegInterno[];
  todosRegs: RegInterno[];
  range: string[];
}

export default function ModoDaily({ filtered, todosRegs, range }: Props) {
  const lista = useMemo(() => {
    const stats = CONSULTORES.map(c => {
      const regs = filtered.filter(r => r.consultor === c);
      const ult = regs.length ? [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] : null;
      const status = ult ? classificar(ult) : 'Sem dados';
      const indice = regs.length ? calcIndice(regs).indice : 0;
      const conversaScore = regs.reduce((s, r) => s + (r.AA?.real || 0) + (r.AF?.real || 0) + (r.AP?.real || 0), 0);
      return { nome: c, status, indice, conversaScore, ult };
    });
    const ord: Record<string, number> = { 'Crítico': 0, 'Atenção': 1, 'Normal': 2, 'Sem dados': 3 };
    stats.sort((a, b) => ord[a.status] !== ord[b.status] ? ord[a.status] - ord[b.status] : b.conversaScore - a.conversaScore);
    return stats;
  }, [filtered]);

  const [idx, setIdx] = useState(0);
  const [visited, setVisited] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (idx >= lista.length) return;
    const t = setTimeout(() => {
      setVisited(prev => {
        const next = new Set(prev);
        if (lista[idx]?.nome) next.add(lista[idx].nome);
        return next;
      });
    }, 1500);
    return () => clearTimeout(t);
  }, [idx, lista]);

  useEffect(() => {
    setVisited(new Set());
    setIdx(0);
  }, [filtered.length, range.join(',')]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
      if (e.key === 'ArrowRight' || e.key === 'j') setIdx(p => Math.min(lista.length - 1, p + 1));
      if (e.key === 'ArrowLeft' || e.key === 'k') setIdx(p => Math.max(0, p - 1));
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [lista.length]);

  const consultor = lista[idx]?.nome;
  const todosConsultor = consultor ? regsValidos(todosRegs).filter(r => r.consultor === consultor) : [];
  const regs = todosConsultor.filter(r => range.includes(r.data));
  const ult = regs.length ? [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] : null;
  const status = ult ? classificar(ult) : 'Sem dados';
  const indice = ult ? calcIndice(regs).indice : 0;
  const trend = calcTendencia(todosConsultor);

  const totAA = regs.reduce((s, r) => s + (r.AA?.real || 0), 0);
  const totAF = regs.reduce((s, r) => s + (r.AF?.real || 0), 0);
  const totAP = regs.reduce((s, r) => s + (r.AP?.real || 0), 0);

  const goIdx = (i: number) => setIdx(Math.max(0, Math.min(lista.length - 1, i)));

  return (
    <div className="theme-dark fade-in">
      <div className="daily-shell">
        <div className="daily-list">
          <div className="daily-list-header">
            <div className="daily-list-eyebrow">Modo Daily</div>
            <div className="daily-list-title">🎯 Fila da equipe</div>
            <div className="daily-list-progress">
              <div className="daily-list-progress-fill" style={{ width: `${(visited.size / Math.max(1, lista.length)) * 100}%` }}></div>
            </div>
            <div className="daily-list-counter">
              {visited.size} de {lista.length} revisados · clique para pular
            </div>
          </div>

          {lista.map((it, i) => {
            const cls = it.status === 'Crítico' ? 'crit'
              : it.status === 'Atenção' ? 'warn'
              : it.status === 'Normal' ? 'normal' : 'empty';
            const isActive = i === idx;
            const isVisited = visited.has(it.nome) && !isActive;
            const ini = it.nome.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
            return (
              <div
                key={it.nome}
                className={`daily-list-item ${isActive ? 'active' : ''} ${isVisited ? 'visited' : ''}`}
                onClick={() => goIdx(i)}
              >
                <div className={`daily-list-item-avatar ${cls}`}>{ini}</div>
                <div className="daily-list-item-content">
                  <div className="daily-list-item-name">
                    {it.nome}
                    {isNovo(it.nome) && <span className="new-badge">NOVO</span>}
                  </div>
                  <div className="daily-list-item-meta">
                    {it.ult ? `${it.indice.toFixed(0)}% · ${it.status}` : 'Sem dados'}
                  </div>
                </div>
                {isVisited
                  ? <span className="daily-list-item-check">✓</span>
                  : <span className={`daily-list-item-status-dot ${cls}`}></span>}
              </div>
            );
          })}
        </div>

        <div className="daily-detail">
          {!consultor ? (
            <div className="daily-empty">
              <div className="daily-empty-icon">👥</div>
              <div className="daily-empty-title">Nenhum consultor selecionado</div>
              <div className="daily-empty-desc">A lista da esquerda está vazia para esse período</div>
            </div>
          ) : (
            <>
              <div className="daily-detail-header">
                <div className="daily-detail-title-block">
                  <Avatar name={consultor} variant={status === 'Crítico' ? 'crit' : 'gold'} size="lg" />
                  <div>
                    <div className="daily-detail-name">
                      {consultor}
                      {isNovo(consultor) && <span className="new-badge">NOVO</span>}
                    </div>
                    <div className="daily-detail-sub">
                      <StatusPill status={status} />
                      {ult && <>
                        <span>·</span>
                        <span>Última: {fmtDataBRLong(new Date(ult.data + 'T12:00:00'))}</span>
                      </>}
                    </div>
                  </div>
                </div>

                <div className="daily-detail-actions">
                  <button onClick={() => goIdx(idx - 1)} disabled={idx === 0} title="Anterior (←)">
                    <Icon name="chevronLeft" size={14} />
                  </button>
                  <button onClick={() => goIdx(idx + 1)} disabled={idx === lista.length - 1} title="Próximo (→)">
                    <Icon name="chevronRight" size={14} />
                  </button>
                </div>
              </div>

              {ult ? (
                <>
                  <div className="daily-detail-stats">
                    <div className="daily-stat">
                      <div className="daily-stat-label">Atingimento</div>
                      <div className="daily-stat-value">{indice.toFixed(0)}<span className="unit">%</span></div>
                    </div>
                    <div className="daily-stat">
                      <div className="daily-stat-label">Funil real (AA · AF · AP)</div>
                      <div className="daily-stat-value">{totAA} · {totAF} · {totAP}</div>
                    </div>
                    <div className="daily-stat">
                      <div className="daily-stat-label">Tendência</div>
                      <div className="daily-stat-value" style={{ fontSize: 22 }}>
                        <TrendArrow trend={trend} />
                      </div>
                    </div>
                  </div>

                  <div className="daily-section-label">Funil completo do período</div>
                  <FunnelDetail regs={regs} />

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginTop: 24 }}>
                    <div>
                      <div className="daily-section-label">⭐ Big Points · {fmtDataBR(new Date(ult.data + 'T12:00:00'))}</div>
                      <div className="bp-card">
                        <div className="bp-head">
                          <span className="bp-name">{(ult.bigPoints || []).length}/3 BPs</span>
                          <span className={`bp-count ${(ult.bigPoints || []).length < 3 ? 'warn' : ''}`}>
                            {(ult.bigPoints || []).length === 3 ? '✓ Completo' : 'Faltando'}
                          </span>
                        </div>
                        {(ult.bigPoints || []).length
                          ? <ul>{ult.bigPoints.map((b, i) => <li key={i}>{b}</li>)}</ul>
                          : <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>Sem Big Points registrados</div>}
                      </div>
                    </div>

                    <div>
                      <div className="daily-section-label">💡 Recomendação de gestão</div>
                      <div className="reco-block">
                        <div className="reco-text" dangerouslySetInnerHTML={{ __html: gerarRecomendacao(ult, regs) }}></div>
                      </div>
                    </div>
                  </div>

                  {ult.prioridade && (
                    <div className="daily-prio-block">
                      <div className="daily-prio-eyebrow">
                        <span>🎯</span><span>Prioridade do dia</span>
                      </div>
                      <div className="daily-prio-text">{ult.prioridade}</div>
                    </div>
                  )}

                  {ult.bloqueio && ult.bloqueio !== 'Sem bloqueio' && (
                    <div style={{ marginTop: 14, padding: 14, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.25)', borderRadius: 12 }}>
                      <div style={{ fontSize: 10.5, fontWeight: 700, color: 'var(--crit)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
                        🚧 Bloqueio ativo
                      </div>
                      <div style={{ fontSize: 13.5, color: 'var(--text)', fontWeight: 600, marginBottom: 4 }}>{ult.bloqueio}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{ult.bloqueioDesc}</div>
                    </div>
                  )}
                </>
              ) : (
                <div className="daily-empty">
                  <div className="daily-empty-icon">📭</div>
                  <div className="daily-empty-title">Sem registros de {consultor} no período</div>
                  <div className="daily-empty-desc">Cobrar preenchimento da daily</div>
                </div>
              )}

              <div className="daily-keyboard-hint">
                <span className="kbd-hint"><kbd>←</kbd>/<kbd>k</kbd> anterior</span>
                <span className="kbd-hint"><kbd>→</kbd>/<kbd>j</kbd> próximo</span>
                <span className="kbd-hint"><kbd>Esc</kbd> sair</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
