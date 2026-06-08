'use client';

import React from 'react';
import Icon from './Icon';
import Avatar from '@/app/dashboard/components/Avatar';
import { isNovo } from '@/lib/constants';
import { FEATURES } from '@/lib/features';
import type { Status } from '@/lib/types';

export interface ConsultorAtivo {
  nome: string;
  status: Status;
  ind: number;
  ativo: boolean;
}

interface Props {
  ativos: ConsultorAtivo[];
  ativosCount: number;
  activeTab: string;
  filtroConsultor: string;
  onTabChange: (tab: string) => void;
  onConsultorClick: (nome: string) => void;
  onClearConsultor?: () => void;
  isLider?: boolean;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}

const ALL_NAV_ITEMS: { key: string; icon: any; label: string; badge?: { txt: string; cls: string }; flag?: keyof typeof FEATURES; liderado?: boolean; liderOnly?: boolean }[] = [
  { key: 'dashboard', icon: 'dashboard', label: 'Dashboard', liderado: true },
  { key: 'conversao', icon: 'funnel', label: 'Conversão', liderado: true },
  { key: 'agenda', icon: 'calendar', label: 'Agenda', flag: 'GOOGLE_CALENDAR', liderado: true },
  { key: 'clientes', icon: 'star', label: 'Clientes', liderado: true },
  { key: 'contatos', icon: 'funnel', label: 'Leads', liderado: true },
  { key: 'funil', icon: 'funnel', label: 'Funil' },
  { key: 'historico', icon: 'history', label: 'Histórico', badge: { txt: 'Beta', cls: 'beta' }, liderado: true },
  { key: 'equipe', icon: 'team', label: 'Equipe & gestão', liderOnly: true },
];

// Sub-abas agrupadas dentro de "Equipe" (reduz a poluição da lista lateral)
export const EQUIPE_TABS = ['equipe', 'atencao', 'ranking', 'metas', 'produtividade'];

export default function Sidebar({ ativos, ativosCount, activeTab, filtroConsultor, onTabChange, onConsultorClick, onClearConsultor, isLider = false, collapsed = false, onToggleCollapse }: Props) {
  const algumSelecionado = !!filtroConsultor;
  const NAV_ITEMS = ALL_NAV_ITEMS.filter(n =>
    (!n.flag || FEATURES[n.flag]) &&
    (isLider || n.liderado) &&
    (!n.liderOnly || isLider)
  );

  return (
    <aside className={`sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="brand-card">
        <div className="brand-logo" style={{ width: 44, height: 44, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, lineHeight: 1 }}>🪣</div>
        <div className="brand-text">CRM Baldada</div>
        {onToggleCollapse && (
          <button
            className="sidebar-collapse-btn"
            onClick={onToggleCollapse}
            title={collapsed ? 'Expandir menu' : 'Recolher menu'}
            aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
          >
            {collapsed ? '»' : '«'}
          </button>
        )}
      </div>

      {isLider && (
      <div className="toggle-group">
        <button
          className={`toggle-pill ${activeTab !== 'modo-daily' ? 'active' : ''}`}
          onClick={() => onTabChange('dashboard')}
        >
          Visão Geral
        </button>
        <button
          className={`toggle-pill ${activeTab === 'modo-daily' ? 'active' : ''}`}
          onClick={() => onTabChange('modo-daily')}
        >
          Modo Daily
        </button>
      </div>
      )}

      <div className="nav-section-label">Menu</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {NAV_ITEMS.map(n => (
          <div
            key={n.key}
            className={`nav-item ${(n.key === 'equipe' ? EQUIPE_TABS.includes(activeTab) : activeTab === n.key) ? 'active' : ''}`}
            onClick={() => onTabChange(n.key)}
            title={collapsed ? n.label : undefined}
          >
            <Icon name={n.icon} size={16} className="nav-icon" />
            <span>{n.label}</span>
            {n.badge && <span className={`nav-badge ${n.badge.cls}`}>{n.badge.txt}</span>}
          </div>
        ))}
      </div>

      {isLider && (<>
      <div className="nav-group-header">
        <span>Consultores</span>
        <span className="nav-badge count">{ativosCount}</span>
      </div>

      {/* Item especial: TODA A EQUIPE — sempre fica no topo */}
      <div
        className={`team-item ${!algumSelecionado ? 'selected' : ''}`}
        onClick={() => onClearConsultor?.()}
        title="Ver dados consolidados de toda a equipe"
      >
        <div className="team-avatar">👥</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="team-title">Toda a equipe</div>
          <div className="team-sub">
            {!algumSelecionado ? 'Visão consolidada · ativa' : 'Clique para voltar'}
          </div>
        </div>
        {!algumSelecionado && <div className="team-dot" />}
      </div>

      <div>
        {ativos.map(a => {
          const selecionado = filtroConsultor === a.nome;
          return (
            <div
              key={a.nome}
              className={`active-item ${!a.ativo ? 'muted' : ''} ${selecionado ? 'selected-strong' : ''} ${algumSelecionado && !selecionado ? 'dim' : ''}`}
              onClick={() => onConsultorClick(a.nome)}
              title={selecionado ? `Vendo ${a.nome} · clique para voltar à equipe` : `Ver ${a.nome} individualmente`}
            >
              <Avatar name={a.nome} variant={a.status === 'Crítico' ? 'crit' : 'gold'} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12.5, color: 'var(--text)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {a.nome}{isNovo(a.nome) && <span className="new-badge">NOVO</span>}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 1 }}>
                  {a.ativo ? `${a.ind.toFixed(0)}% atingimento` : 'Sem dados'}
                </div>
              </div>
              {selecionado && <div className="selected-bar" />}
            </div>
          );
        })}
      </div>
      </>)}
    </aside>
  );
}
