'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { calcConversoes, calcIndice, classificar, fmtData, fmtDataBR, regsValidos, intervaloUltimosDias, ultimosDiasUteis, tipoDia } from '@/lib/calculos';
import { CONSULTORES, METRICAS_4 } from '@/lib/constants';
import type { RegInterno } from '@/lib/types';
import Sidebar, { type ConsultorAtivo, EQUIPE_TABS } from '@/components/Sidebar'
import Icon from '@/components/Icon';
import Avatar from './components/Avatar';
import SparkLine from './components/SparkLine';
import ModalConsultor from './ModalConsultor';

import Dashboard from './secoes/Dashboard';
import Conversao from './secoes/Conversao';
import Ranking from './secoes/Ranking';
import Historico from './secoes/Historico';
import Atencao from './secoes/Atencao';
import ModoDaily from './secoes/ModoDaily';
import Agenda from './secoes/Agenda';
import Produtividade from './secoes/Produtividade';
import Funil from './secoes/Funil';
import Metas from './secoes/Metas';
import CentralNotificacoes from './components/CentralNotificacoes';
import CommandPalette from './components/CommandPalette';
import Clientes from './secoes/Clientes';
import Contatos from './secoes/Contatos';
import Equipe from './secoes/Equipe';
import { FEATURES } from '@/lib/features';
import { supabase } from '@/lib/supabase';

interface Props {
  registros: RegInterno[];
  userEmail: string;
  userName: string;
  isLider: boolean;
  consultores?: string[];
}
const SEC_INFO: Record<string, { titulo: string; sub: string }> = {
  dashboard: { titulo: 'Dashboard', sub: 'Acompanhe o funil consultivo da equipe em tempo real.' },
  conversao: { titulo: 'Conversão', sub: 'Análise do funil de conversão da equipe.' },
  atencao: { titulo: 'Atenção', sub: 'Alertas, Big Points e Bloqueios da equipe.' },
  funil: { titulo: 'Funil', sub: 'Conversão entre etapas, tempo na jornada e clientes estagnados.' },
  ranking: { titulo: 'Ranking', sub: 'Classificação dos consultores no período.' },
  historico: { titulo: 'Histórico', sub: 'Evolução dos registros ao longo do tempo.' },
  agenda: { titulo: 'Agenda', sub: 'Seus eventos sincronizados do Google Calendar.' },
  'modo-daily': { titulo: 'Modo Daily', sub: 'Revisão rápida da equipe, um a um.' },
  clientes: { titulo: 'Clientes', sub: 'Sua base de clientes ativos.' },
  contatos: { titulo: 'Leads', sub: 'Seus leads em lista ou no board de pipeline — arraste para mover.' },
  metas: { titulo: 'Metas', sub: 'Metas mensais por consultor e previsão de fechamentos.' },
  produtividade: { titulo: 'Produtividade', sub: 'Carteira, reuniões e atividades por consultor no mês.' },
  equipe: { titulo: 'Equipe & gestão', sub: 'Membros, atenção, ranking, metas e produtividade da equipe.' },
};

export default function DashboardClient({ registros, userEmail, userName, isLider, consultores }: Props) {
  // Fase 2A: lista vinda do banco, com fallback pra constante (rede de seguranca).
  // Ainda nao consumida pelas telas — fase 2B faz a troca arquivo a arquivo.
  const listaConsultores = (consultores && consultores.length > 0) ? consultores : [...CONSULTORES];
  const [activeTab, setActiveTab] = useState('dashboard');
  const [periodo, setPeriodo] = useState('semanal');
  const [filtroConsultor, setFiltroConsultor] = useState('');
  const [filtroStatus, setFiltroStatus] = useState('');
  const [selectedConsultor, setSelectedConsultor] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; isError?: boolean } | null>(null);

  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [cmdkOpen, setCmdkOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  // Restaura preferência de sidebar recolhida
  useEffect(() => {
    try { if (localStorage.getItem('sidebarCollapsed') === 'true') setSidebarCollapsed(true); } catch {}
  }, []);
  const [openDropdown, setOpenDropdown] = useState<'mail' | 'bell' | 'user' | null>(null);
  const [searchPessoas, setSearchPessoas] = useState<{ id: string; nome: string; fase: string; status: string; empresa: string | null }[]>([]);
  const [searchPessoasLoading, setSearchPessoasLoading] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Datas referência: último dia útil
  const diasUteis = useMemo(() => ultimosDiasUteis(30), []);
  const dataRef = diasUteis[diasUteis.length - 1] ? fmtData(diasUteis[diasUteis.length - 1]) : fmtData(new Date());

  // Range conforme período
  const range = useMemo(() => {
    if (periodo === 'diario') return [dataRef];
    if (periodo === 'semanal') {
      const idx = diasUteis.findIndex(d => fmtData(d) === dataRef);
      if (idx < 0) return [dataRef];
      const start = Math.max(0, idx - 4);
      return diasUteis.slice(start, idx + 1).map(fmtData);
    }
    if (periodo === 'mensal') {
      const ref = new Date(dataRef + 'T12:00:00');
      return intervaloUltimosDias(31)
        .filter(d => d.getMonth() === ref.getMonth() && d.getFullYear() === ref.getFullYear() && tipoDia(d) === 'util')
        .map(fmtData);
    }
    return diasUteis.map(fmtData);
  }, [periodo, dataRef, diasUteis]);

  const todosValidos = useMemo(() => regsValidos(registros), [registros]);

  const filtered = useMemo(() => {
    return todosValidos.filter(r => {
      if (!range.includes(r.data)) return false;
      if (filtroConsultor && r.consultor !== filtroConsultor) return false;
      if (filtroStatus === 'bloqueio' && r.bloqueio === 'Sem bloqueio') return false;
      if (filtroStatus === 'ajuda' && r.ajuda !== 'Sim') return false;
      if (filtroStatus === 'risco' && classificar(r) !== 'Crítico') return false;
      return true;
    });
  }, [todosValidos, range, filtroConsultor, filtroStatus]);

  const conv = useMemo(() => calcConversoes(filtered), [filtered]);
  const dataAlvo = range[range.length - 1] || dataRef;
  const consultoresPreencheram = new Set(todosValidos.filter(r => r.data === dataAlvo).map(r => r.consultor));

  const ativos: ConsultorAtivo[] = useMemo(() => {
    return listaConsultores.map(c => {
      const regs = filtered.filter(r => r.consultor === c);
      const ult = regs.length ? [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] : null;
      const status = ult ? classificar(ult) : 'Sem dados' as const;
      const ind = calcIndice(regs).indice;
      return { nome: c, status, ind, ativo: regs.length > 0 };
    });
  }, [filtered]);
  const ativosCount = ativos.filter(a => a.ativo).length;

  const metricsSpark = useMemo(() => {
    return METRICAS_4.map(m => range.map(d => calcConversoes(filtered.filter(r => r.data === d))[m.key as keyof ReturnType<typeof calcConversoes>] as number));
  }, [filtered, range]);

  const metricsTrend = useMemo(() => {
    return METRICAS_4.map(m => {
      const half = Math.floor(range.length / 2);
      if (half < 1) return { delta: 0, dir: 'flat' as const };
      const r1 = filtered.filter(r => range.slice(0, half).includes(r.data));
      const r2 = filtered.filter(r => range.slice(half).includes(r.data));
      const v1 = calcConversoes(r1)[m.key as keyof ReturnType<typeof calcConversoes>] as number;
      const v2 = calcConversoes(r2)[m.key as keyof ReturnType<typeof calcConversoes>] as number;
      const delta = v2 - v1;
      return { delta, dir: delta > 2 ? 'up' as const : delta < -2 ? 'down' as const : 'flat' as const };
    });
  }, [filtered, range]);

  const showToastMsg = (msg: string, isError?: boolean) => {
    setToast({ msg, isError });
    setTimeout(() => setToast(null), 3500);
  };

  // Atalhos de teclado
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdkOpen(o => !o);
      }
      if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
        e.preventDefault();
        setShowSearch(true);
        setTimeout(() => searchRef.current?.focus(), 50);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setOpenDropdown(null);
        setCmdkOpen(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Click outside dropdowns
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('.dropdown-anchor') && !target.closest('.search-box')) {
        setOpenDropdown(null);
        setShowSearch(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Search
  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return null;
    const consultores = listaConsultores.filter(c => c.toLowerCase().includes(q));
    const bigPoints: { texto: string; consultor: string; data: string }[] = [];
    const bloqueios: { tipo: string; desc: string; consultor: string; data: string }[] = [];
    todosValidos.forEach(r => {
      (r.bigPoints || []).forEach(bp => {
        if (bp.toLowerCase().includes(q)) bigPoints.push({ texto: bp, consultor: r.consultor, data: r.data });
      });
      if (r.bloqueio !== 'Sem bloqueio' && (r.bloqueio.toLowerCase().includes(q) || (r.bloqueioDesc || '').toLowerCase().includes(q))) {
        bloqueios.push({ tipo: r.bloqueio, desc: r.bloqueioDesc, consultor: r.consultor, data: r.data });
      }
    });
    return { consultores, bigPoints: bigPoints.slice(0, 5), bloqueios: bloqueios.slice(0, 5) };
  }, [searchQuery, todosValidos]);

  // Busca global de pessoas (clientes e contatos) com debounce
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    const q = searchQuery.trim();
    if (q.length < 2) { setSearchPessoas([]); return; }
    searchDebounceRef.current = setTimeout(async () => {
      setSearchPessoasLoading(true);
      const { data } = await supabase
        .from('pessoas')
        .select('id, nome, fase, status, empresa')
        .ilike('nome', `%${q}%`)
        .limit(6);
      setSearchPessoas((data || []) as { id: string; nome: string; fase: string; status: string; empresa: string | null }[]);
      setSearchPessoasLoading(false);
    }, 280);
  }, [searchQuery]);

  // Notificações
  const notifAlertas = useMemo(() => {
    const arr: { tipo: 'crit' | 'warn'; titulo: string; desc: string; who: string }[] = [];
    listaConsultores.forEach(c => {
      const regs = filtered.filter(r => r.consultor === c);
      if (!regs.length) return;
      const indice = calcIndice(regs).indice;
      if (indice < 40) arr.push({ tipo: 'crit', titulo: 'Índice crítico', desc: `${c} · ${indice.toFixed(0)}% no período`, who: c });
    });
    filtered.filter(r => r.ajuda === 'Sim').forEach(r => {
      arr.push({ tipo: 'crit', titulo: 'Pediu ajuda', desc: `${r.consultor} solicita apoio em ${fmtDataBR(new Date(r.data + 'T12:00:00'))}`, who: r.consultor });
    });
    filtered.filter(r => r.bloqueio !== 'Sem bloqueio').slice(0, 5).forEach(r => {
      arr.push({ tipo: 'warn', titulo: r.bloqueio, desc: `${r.consultor} · ${r.bloqueioDesc}`, who: r.consultor });
    });
    return arr.slice(0, 8);
  }, [filtered]);

  const mailItems = useMemo(() => {
    return [...todosValidos].sort((a, b) => b.data.localeCompare(a.data)).slice(0, 6).map(r => ({
      consultor: r.consultor, data: r.data,
      avanco: r.avanco || 'Sem novidades', confianca: r.confianca,
    }));
  }, [todosValidos]);

  const goToConsultor = (nome: string) => {
    setSelectedConsultor(nome);
    setShowSearch(false);
    setSearchQuery('');
  };
  const goToTab = (tab: string) => {
    setActiveTab(tab);
    setOpenDropdown(null);
    setShowSearch(false);
  };
  const handleImport = () => fileInputRef.current?.click();
  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) showToastMsg(`✓ Arquivo "${f.name}" recebido (mock — sem persistência)`);
    e.target.value = '';
  };
  const handleLogout = async () => {
    setOpenDropdown(null);
    const { supabase } = await import('@/lib/supabase');
    await supabase.auth.signOut();
    window.location.href = '/login';
  };
  const handleRefresh = () => {
    showToastMsg('✓ Recarregando dados...');
    window.location.reload();
  };

  const handleConsultorClick = (nome: string) => {
    setFiltroConsultor(filtroConsultor === nome ? '' : nome);
  };

  const handleClearConsultor = () => {
    setFiltroConsultor('');
  };

  const userInitial = (userName || userEmail || 'U').charAt(0).toUpperCase();

  // Itens de navegação para o command palette (respeitam o papel do usuário)
  const cmdkNavItems = useMemo(() => {
    const all: { key: string; label: string; emoji: string; liderOnly?: boolean; flag?: keyof typeof FEATURES }[] = [
      { key: 'dashboard', label: 'Dashboard', emoji: '📊' },
      { key: 'conversao', label: 'Conversão', emoji: '🔻' },
      { key: 'agenda', label: 'Agenda', emoji: '📅', flag: 'GOOGLE_CALENDAR' },
      { key: 'clientes', label: 'Clientes', emoji: '👤' },
      { key: 'contatos', label: 'Leads', emoji: '🌱' },
      { key: 'atencao', label: 'Atenção', emoji: '⚠️', liderOnly: true },
      { key: 'funil', label: 'Funil', emoji: '🔄', liderOnly: true },
      { key: 'ranking', label: 'Ranking', emoji: '🏆', liderOnly: true },
      { key: 'historico', label: 'Histórico', emoji: '📈' },
      { key: 'metas', label: 'Metas', emoji: '🎯', liderOnly: true },
      { key: 'produtividade', label: 'Produtividade', emoji: '📋', liderOnly: true },
      { key: 'equipe', label: 'Equipe & gestão', emoji: '👥', liderOnly: true },
    ];
    return all.filter(n => (!n.flag || FEATURES[n.flag]) && (!n.liderOnly || isLider));
  }, [isLider]);

  return (
    <div className={`app-grid${sidebarCollapsed ? ' collapsed' : ''}`}>
      <Sidebar
        ativos={ativos}
        ativosCount={ativosCount}
        activeTab={activeTab}
        filtroConsultor={filtroConsultor}
        onTabChange={setActiveTab}
        onConsultorClick={handleConsultorClick}
        onClearConsultor={handleClearConsultor}
        isLider={isLider}
        collapsed={sidebarCollapsed}
        onToggleCollapse={() => setSidebarCollapsed(v => { try { localStorage.setItem('sidebarCollapsed', String(!v)); } catch {} return !v; })}
      />

      <main className="main">
        {/* TOP BAR */}
        <div className="top-bar">
          <div className="search-box dropdown-anchor" style={{ position: 'relative' }}>
            <Icon name="search" size={14} style={{ color: 'var(--muted)' }} />
            <input
              ref={searchRef}
              placeholder="Buscar consultor, bloqueio, big point..."
              value={searchQuery}
              onChange={e => { setSearchQuery(e.target.value); setShowSearch(true); }}
              onFocus={() => setShowSearch(true)}
            />
            <span className="kbd">⌘ K</span>
            {showSearch && (searchResults || searchQuery.trim().length >= 2) && (
              <div className="search-results">
                {/* Clientes e contatos */}
                {searchPessoas.length > 0 && (
                  <>
                    <div className="search-result-group">Pessoas · {searchPessoas.length}</div>
                    {searchPessoas.map(p => (
                      <div key={p.id} className="dropdown-item" onClick={() => { goToTab(p.fase === 'cliente' ? 'clientes' : 'contatos'); setShowSearch(false); }}>
                        <div className="di-icon ok">{p.fase === 'cliente' ? '👤' : '🌱'}</div>
                        <div className="di-content">
                          <div className="di-title">{p.nome}</div>
                          <div className="di-desc">{p.fase === 'cliente' ? 'Cliente' : 'Contato'}{p.empresa ? ` · ${p.empresa}` : ''}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchPessoasLoading && <div className="dropdown-empty">Buscando pessoas...</div>}

                {/* Resultados existentes (consultores, big points, bloqueios) */}
                {searchResults && searchResults.consultores.length === 0 && searchResults.bigPoints.length === 0 && searchResults.bloqueios.length === 0 && searchPessoas.length === 0 && !searchPessoasLoading && (
                  <div className="dropdown-empty">Nenhum resultado para &quot;{searchQuery}&quot;</div>
                )}
                {searchResults?.consultores && searchResults.consultores.length > 0 && (
                  <>
                    <div className="search-result-group">Consultores · {searchResults.consultores.length}</div>
                    {searchResults.consultores.map(c => (
                      <div key={c} className="dropdown-item" onClick={() => goToConsultor(c)}>
                        <Avatar name={c} variant="gold" />
                        <div className="di-content">
                          <div className="di-title">{c}</div>
                          <div className="di-desc">Abrir perfil completo</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults?.bigPoints && searchResults.bigPoints.length > 0 && (
                  <>
                    <div className="search-result-group">Big Points · {searchResults.bigPoints.length}</div>
                    {searchResults.bigPoints.map((bp, i) => (
                      <div key={i} className="dropdown-item" onClick={() => goToConsultor(bp.consultor)}>
                        <div className="di-icon ok">⭐</div>
                        <div className="di-content">
                          <div className="di-title">{bp.texto}</div>
                          <div className="di-desc">{bp.consultor} · {fmtDataBR(new Date(bp.data + 'T12:00:00'))}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
                {searchResults?.bloqueios && searchResults.bloqueios.length > 0 && (
                  <>
                    <div className="search-result-group">Bloqueios · {searchResults.bloqueios.length}</div>
                    {searchResults.bloqueios.map((b, i) => (
                      <div key={i} className="dropdown-item" onClick={() => { goToTab('atencao'); setFiltroConsultor(b.consultor); }}>
                        <div className="di-icon warn">🚧</div>
                        <div className="di-content">
                          <div className="di-title">{b.tipo}</div>
                          <div className="di-desc">{b.consultor} · {b.desc}</div>
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <CentralNotificacoes onAbrirPessoa={() => goToTab('clientes')} />
            <div className="dropdown-anchor">
              <button className="icon-btn" onClick={() => setOpenDropdown(openDropdown === 'mail' ? null : 'mail')} data-tip="Atividade recente">
                <Icon name="mail" size={16} />
              </button>
              {openDropdown === 'mail' && (
                <div className="dropdown-panel">
                  <div className="dropdown-header">
                    <span>Atividade recente da equipe</span>
                    <button className="clear-btn" onClick={() => goToTab('historico')}>Ver tudo</button>
                  </div>
                  {mailItems.length === 0 ? (
                    <div className="dropdown-empty">Sem atividade registrada</div>
                  ) : mailItems.map((m, i) => (
                    <div key={i} className="dropdown-item" onClick={() => goToConsultor(m.consultor)}>
                      <div className="di-icon ok">{m.consultor.slice(0, 1)}</div>
                      <div className="di-content">
                        <div className="di-title">{m.consultor}</div>
                        <div className="di-desc">{m.avanco}</div>
                        <div className="di-time">{fmtDataBR(new Date(m.data + 'T12:00:00'))} · confiança {m.confianca}/5</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-anchor">
              <button className="icon-btn" onClick={() => setOpenDropdown(openDropdown === 'bell' ? null : 'bell')} data-tip="Notificações">
                <Icon name="bell" size={16} />
                {notifAlertas.length > 0 && <span className="notif-dot">{notifAlertas.length > 9 ? '9+' : notifAlertas.length}</span>}
              </button>
              {openDropdown === 'bell' && (
                <div className="dropdown-panel">
                  <div className="dropdown-header">
                    <span>Alertas · {notifAlertas.length}</span>
                    <button className="clear-btn" onClick={() => goToTab('atencao')}>Ver todos</button>
                  </div>
                  {notifAlertas.length === 0 ? (
                    <div className="dropdown-empty">✓ Nenhum alerta</div>
                  ) : notifAlertas.map((a, i) => (
                    <div key={i} className="dropdown-item" onClick={() => goToConsultor(a.who)}>
                      <div className={`di-icon ${a.tipo}`}>{a.tipo === 'crit' ? '🚨' : '⚠️'}</div>
                      <div className="di-content">
                        <div className="di-title">{a.titulo}</div>
                        <div className="di-desc">{a.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="dropdown-anchor">
              <button
                className="user-card"
                style={{ cursor: 'pointer', background: '#fff', border: '1px solid var(--line)', font: 'inherit', padding: '6px 14px 6px 6px' }}
                onClick={() => setOpenDropdown(openDropdown === 'user' ? null : 'user')}
              >
                <div className="user-avatar">{userInitial}</div>
                <div style={{ textAlign: 'left' }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{userName || 'Gestor'}</div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>{userEmail}</div>
                </div>
              </button>
              {openDropdown === 'user' && (
                <div className="dropdown-panel" style={{ minWidth: 240 }}>
                  <div className="dropdown-item" onClick={() => { setOpenDropdown(null); showToastMsg('✓ Perfil em construção'); }}>
                    <div className="di-icon">👤</div>
                    <div className="di-content"><div className="di-title">Meu perfil</div></div>
                  </div>
                  <div className="dropdown-item" onClick={() => { setOpenDropdown(null); showToastMsg('✓ Configurações em construção'); }}>
                    <div className="di-icon"><Icon name="settings" size={14} /></div>
                    <div className="di-content"><div className="di-title">Configurações</div></div>
                  </div>
                  <div className="dropdown-item" onClick={handleRefresh}>
                    <div className="di-icon"><Icon name="refresh" size={14} /></div>
                    <div className="di-content"><div className="di-title">Recarregar dados</div></div>
                  </div>
                  <div style={{ borderTop: '1px solid var(--line)', margin: '6px 4px' }}></div>
                  <div className="dropdown-item" onClick={handleLogout} style={{ color: 'var(--crit)' }}>
                    <div className="di-icon crit">↪</div>
                    <div className="di-content"><div className="di-title" style={{ color: 'var(--crit)' }}>Sair</div></div>
                  </div>
                </div>
              )}
            </div>
          </div>

          <input ref={fileInputRef} type="file" style={{ display: 'none' }} accept=".csv,.xlsx,.json" onChange={handleFileSelected} />
        </div>

        {/* SECTION HEADER */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div className="sec-eyebrow">
              <span className="eyebrow-dot"></span>
              <span>Dados {periodo === 'diario' ? 'do dia' : periodo === 'semanal' ? 'da semana' : 'do mês'}</span>
              <span style={{ color: 'var(--primary)' }}>·</span>
              <span style={{ color: 'var(--text-dim)' }}>{filtered.length} registros</span>
              {!filtroConsultor ? (
                isLider ? (
                  <span className="scope-chip team">
                    <span className="scope-chip-icon">👥</span>
                    <span>Toda a equipe</span>
                    <span className="scope-chip-count">{ativosCount} ativos</span>
                  </span>
                ) : (
                  <span className="scope-chip individual">
                    <span className="scope-chip-icon">👤</span>
                    <span>Meus dados</span>
                  </span>
                )
              ) : (
                <span className="scope-chip individual">
                  <span className="scope-chip-icon">👤</span>
                  <span>Vendo · <strong>{filtroConsultor}</strong></span>
                  <button
                    className="scope-chip-clear"
                    onClick={handleClearConsultor}
                    title="Voltar para visão da equipe"
                    aria-label="Voltar para visão da equipe"
                  >✕</button>
                </span>
              )}
            </div>
            <h1 className="sec-title">
              {filtroConsultor ? filtroConsultor : (SEC_INFO[activeTab]?.titulo ?? 'Dashboard')}
            </h1>
            <div className="sec-sub">
              {filtroConsultor
                ? <>Visão individual de <strong>{filtroConsultor}</strong>. <button className="link-btn" onClick={handleClearConsultor}>← Voltar para toda a equipe</button></>
                : (SEC_INFO[activeTab]?.sub ?? 'Acompanhe o funil consultivo da equipe em tempo real.')
              }
            </div>
          </div>

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            <button className="action-btn primary" onClick={handleRefresh}>
              <Icon name="refresh" size={14} /> Recarregar
            </button>
            <button className="action-btn" onClick={handleImport}>
              <Icon name="upload" size={14} /> Importar
            </button>
            <div className="filter-pill">
              <select value={periodo} onChange={e => setPeriodo(e.target.value)}>
                <option value="diario">Diário</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
                <option value="historico">Histórico</option>
              </select>
              <Icon name="chevronDown" size={10} className="caret" />
            </div>
            <div className={`filter-pill ${filtroConsultor ? 'active' : ''}`} title={filtroConsultor ? `Filtrando por ${filtroConsultor}` : 'Filtrar por consultor'}>
              <select value={filtroConsultor} onChange={e => setFiltroConsultor(e.target.value)}>
                <option value="">👥 Toda a equipe</option>
                {listaConsultores.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <Icon name="chevronDown" size={10} className="caret" />
            </div>
          </div>
        </div>

        {/* 4 MÉTRICAS — só no Dashboard */}
        {activeTab === 'dashboard' && (
          <div className="metrics-grid fade-in">
            {METRICAS_4.map((m, i) => {
              const v = conv[m.key as keyof typeof conv] as number;
              const t = metricsTrend[i];
              const featured = i === 0;
              return (
                <div key={m.key} className={`metric-card ${featured ? 'featured' : ''} clickable`} onClick={() => goToTab('conversao')}>
                  <div className="metric-head">
                    <div>
                      <div style={{ fontSize: 11.5, fontWeight: 600, opacity: .7, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>{m.key}</div>
                      <div className="metric-title">{m.label}</div>
                    </div>
                    <div className="metric-arrow">
                      <Icon name="arrowUpRight" size={14} />
                    </div>
                  </div>
                  <div className="metric-value">
                    <span className="num">{v.toFixed(1)}</span>
                    <span className="pct">%</span>
                  </div>
                  <div className="metric-foot">
                    <span className={`metric-delta ${t.dir === 'up' ? 'up' : t.dir === 'down' ? 'down' : ''}`}>
                      {t.dir === 'up' ? '▲' : t.dir === 'down' ? '▼' : '—'} {Math.abs(t.delta).toFixed(1)}%
                    </span>
                    <span>vs início do período</span>
                  </div>
                  <SparkLine data={metricsSpark[i]} color={featured ? '#ffffff' : '#0f172a'} height={56} />
                  <div className="metric-raw">{m.desc}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* SUB-ABAS do grupo Equipe & gestão */}
        {EQUIPE_TABS.includes(activeTab) && (
          <div className="subtabs">
            {([
              { key: 'equipe', label: 'Membros', emoji: '👥' },
              { key: 'atencao', label: 'Atenção', emoji: '⚠️' },
              { key: 'ranking', label: 'Ranking', emoji: '🏆' },
              { key: 'metas', label: 'Metas', emoji: '🎯' },
              { key: 'produtividade', label: 'Produtividade', emoji: '📋' },
            ]).map(t => (
              <button
                key={t.key}
                className={`subtab ${activeTab === t.key ? 'active' : ''}`}
                onClick={() => setActiveTab(t.key)}
              >
                <span>{t.emoji}</span> {t.label}
              </button>
            ))}
          </div>
        )}

        {/* SEÇÕES */}
        {activeTab === 'dashboard' && <Dashboard filtered={filtered} range={range} todosRegs={registros} onSelect={setSelectedConsultor} onGoTab={goToTab} onRefresh={handleRefresh} filtroConsultor={filtroConsultor} consultores={listaConsultores} isLider={isLider} />}
        {activeTab === 'conversao' && <Conversao filtered={filtered} />}
        {activeTab === 'atencao' && <Atencao filtered={filtered} consultoresPreencheram={consultoresPreencheram} dataAlvo={dataAlvo} periodo={periodo} consultores={listaConsultores} onSelect={setSelectedConsultor} />}
        {activeTab === 'funil' && <Funil isLider={isLider} />}
        {activeTab === 'ranking' && <Ranking filtered={filtered} todosRegs={registros} range={range} onSelect={setSelectedConsultor} consultores={listaConsultores} />}
        {activeTab === 'historico' && <Historico todosRegs={registros} dataRef={dataRef} filtroConsultor={filtroConsultor} consultores={listaConsultores} />}
        {activeTab === 'agenda' && FEATURES.GOOGLE_CALENDAR && <Agenda filtroConsultor={filtroConsultor} />}
        {activeTab === 'modo-daily' && <ModoDaily filtered={filtered} todosRegs={registros} range={range} consultores={listaConsultores} />}
        {activeTab === 'clientes' && <Clientes isLider={isLider} />}
        {activeTab === 'contatos' && <Contatos />}
        {activeTab === 'metas' && <Metas />}
        {activeTab === 'produtividade' && <Produtividade />}
        {activeTab === 'equipe' && <Equipe />}
      </main>

      {selectedConsultor && (
        <ModalConsultor
          consultor={selectedConsultor}
          todosRegs={registros}
          range={range}
          onClose={() => setSelectedConsultor(null)}
        />
      )}

      {toast && <div className={`toast ${toast.isError ? 'error' : ''}`}>{toast.msg}</div>}

      <CommandPalette
        open={cmdkOpen}
        onClose={() => setCmdkOpen(false)}
        navItems={cmdkNavItems}
        onGoTab={goToTab}
        onRefresh={handleRefresh}
        onImport={handleImport}
        onNovoCliente={() => goToTab('clientes')}
        onNovoLead={() => goToTab('contatos')}
      />
    </div>
  );
}
