'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ContatoStatus } from '@/lib/types';
import PerfilCliente from './PerfilCliente';
import AgendarReuniao from './AgendarReuniao';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  useDroppable, useDraggable, pointerWithin,
  type DragStartEvent, type DragEndEvent,
} from '@dnd-kit/core';

// ─── Configuração de status ───────────────────────────────────
const STATUS_LABEL: Record<ContatoStatus, string> = {
  novo:              'Novo',
  contatado:         'Contatado',
  reuniao_agendada:  'Reunião agendada',
  convertido:        'Convertido',
  perdido:           'Perdido',
};

const STATUS_ORDER: ContatoStatus[] = ['novo', 'contatado', 'reuniao_agendada', 'convertido', 'perdido'];

const STATUS_CONFIG: Record<ContatoStatus, { bg: string; fg: string; emoji: string }> = {
  novo:             { bg: 'rgba(99,102,241,.15)',  fg: '#5457d6', emoji: '🌱' },
  contatado:        { bg: 'rgba(245,158,11,.15)',  fg: '#F59E0B', emoji: '📞' },
  reuniao_agendada: { bg: 'rgba(34,160,90,.15)',   fg: '#1a8a4a', emoji: '📅' },
  convertido:       { bg: 'rgba(34,160,90,.22)',   fg: '#137a3e', emoji: '🏆' },
  perdido:          { bg: 'rgba(120,120,120,.15)', fg: '#777',    emoji: '❌' },
};

function fmtData(iso: string | null) {
  if (!iso) return '';
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

type View = 'lista' | 'board';
type SortKey = 'nome' | 'status' | 'proximo_contato';
type SortDir = 'asc' | 'desc';

// ─── Componente principal ─────────────────────────────────────
export default function Contatos({ isLider = false }: { isLider?: boolean }) {
  const [contatos, setContatos] = useState<Pessoa[]>([]);
  const [donos, setDonos] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<View>('lista');
  const [filtroStatus, setFiltroStatus] = useState<'todos' | ContatoStatus>('todos');
  const [busca, setBusca] = useState('');
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);
  const [agendarPara, setAgendarPara] = useState<Pessoa | null>(null);
  const [modalNovo, setModalNovo] = useState<ContatoStatus | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [erro, setErro] = useState('');
  const [sortKey, setSortKey] = useState<SortKey>('proximo_contato');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const toggleSort = (k: SortKey) => {
    if (k === sortKey) setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
    else { setSortKey(k); setSortDir('asc'); }
  };

  // Mapa user_id → nome do consultor (só o líder vê o dono do lead)
  useEffect(() => {
    if (!isLider) return;
    supabase.from('profiles').select('id, nome, consultor_nome').then(({ data }) => {
      const m: Record<string, string> = {};
      (data || []).forEach((p: { id: string; nome: string | null; consultor_nome: string | null }) => {
        m[p.id] = p.consultor_nome || p.nome || '—';
      });
      setDonos(m);
    });
  }, [isLider]);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'lead')
      .order('proximo_contato', { ascending: true, nullsFirst: false });
    if (error) { setErro(error.message); }
    else { setContatos((data as Pessoa[]) || []); setErro(''); }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const filtrados = useMemo(() => {
    const q = busca.toLowerCase().trim();
    return contatos.filter(c => {
      const okStatus = filtroStatus === 'todos' || c.status === filtroStatus;
      const okBusca = !q || [c.nome, c.telefone, c.empresa]
        .some(v => (v || '').toLowerCase().includes(q));
      return okStatus && okBusca;
    });
  }, [contatos, filtroStatus, busca]);

  const ordenados = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filtrados].sort((a, b) => {
      const va = (a[sortKey] || '').toString().toLowerCase();
      const vb = (b[sortKey] || '').toString().toLowerCase();
      if (!va && vb) return 1;   // vazios sempre ao fim
      if (va && !vb) return -1;
      return va.localeCompare(vb, 'pt-BR') * dir;
    });
  }, [filtrados, sortKey, sortDir]);

  // Drag & drop (board) — dnd-kit
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  const moverPara = useCallback(async (id: string, novoStatus: ContatoStatus) => {
    setContatos(prev => prev.map(p => p.id === id ? { ...p, status: novoStatus } : p));
    await supabase.from('pessoas').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', id);
  }, []);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));
  const onDragEnd = (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const col = e.over?.id as ContatoStatus | undefined;
    const atual = contatos.find(p => p.id === id);
    if (col && STATUS_ORDER.includes(col) && atual && atual.status !== col) {
      moverPara(id, col);
    }
  };
  const activeCard = activeId ? contatos.find(p => p.id === activeId) || null : null;

  const converterEmCliente = async (c: Pessoa) => {
    if (!confirm(`Converter "${c.nome}" em cliente?`)) return;
    await supabase.from('pessoas').update({
      fase: 'cliente', status: 'ativo',
      data_inicio: new Date().toISOString().slice(0, 10),
      convertido_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }).eq('id', c.id);
    carregar();
  };

  const excluir = async (c: Pessoa, e?: React.MouseEvent) => {
    e?.stopPropagation();
    if (!confirm(`Excluir "${c.nome}"?`)) return;
    await supabase.from('pessoas').delete().eq('id', c.id);
    carregar();
  };

  const porColuna = (key: ContatoStatus) => filtrados.filter(p => p.status === key);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10, marginBottom: 14 }}>
        <div style={{ fontSize: 12.5, color: 'var(--muted)' }}>
          {contatos.length} lead{contatos.length !== 1 ? 's' : ''}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {/* Toggle vista */}
          <div style={{ display: 'flex', borderRadius: 8, border: '1px solid var(--line)', overflow: 'hidden' }}>
            {([
              { key: 'lista', label: '☰ Lista' },
              { key: 'board', label: '⬛ Board' },
            ] as { key: View; label: string }[]).map(v => (
              <button
                key={v.key}
                onClick={() => setView(v.key)}
                style={{
                  padding: '6px 12px', border: 'none', fontSize: 12.5, fontWeight: 600, cursor: 'pointer',
                  background: view === v.key ? 'var(--primary)' : 'transparent',
                  color: view === v.key ? '#fff' : 'var(--muted)',
                }}
              >
                {v.label}
              </button>
            ))}
          </div>
          <button onClick={() => setModalNovo('novo')} style={btnPrimary}>+ Adicionar</button>
        </div>
      </div>

      {/* Filtros — só na vista lista */}
      {view === 'lista' && (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 14, alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
            <button onClick={() => setFiltroStatus('todos')} style={filtroStatus === 'todos' ? pillActive : pill}>Todos</button>
            {STATUS_ORDER.map(s => (
              <button key={s} onClick={() => setFiltroStatus(s)} style={s === filtroStatus ? pillActive : pill}>
                {STATUS_CONFIG[s].emoji} {STATUS_LABEL[s]}
              </button>
            ))}
          </div>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar..."
            style={{ flex: 1, minWidth: 160, padding: '7px 11px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13 }}
          />
        </div>
      )}

      {view === 'board' && (
        <div style={{ marginBottom: 12 }}>
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar lead..."
            style={{ width: '100%', padding: '7px 11px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
          />
        </div>
      )}

      {erro && <div style={errorBox}>{erro}</div>}

      {loading ? (
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : view === 'lista' ? (
        /* ── Vista Lista ── */
        ordenados.length === 0 ? (
          <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Nenhum lead encontrado.</div>
        ) : (
          <div className="dt-wrap">
            <table className="dt">
              <thead>
                <tr>
                  <Th label="Nome" k="nome" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  {isLider && <th>Consultor</th>}
                  <th>Contato</th>
                  <Th label="Status" k="status" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <Th label="Próximo contato" k="proximo_contato" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
                  <th style={{ textAlign: 'right' }}>Ações</th>
                </tr>
              </thead>
              <tbody>
                {ordenados.map(c => {
                  const cfg = STATUS_CONFIG[c.status as ContatoStatus] || STATUS_CONFIG.novo;
                  const atrasado = c.proximo_contato && new Date(c.proximo_contato) < new Date();
                  return (
                    <tr key={c.id} onClick={() => setPerfilAberto(c)}>
                      <td><span className="dt-name">{c.nome}</span></td>
                      {isLider && <td className="dt-sub">{donos[c.user_id] || '—'}</td>}
                      <td>
                        <div className="dt-sub">
                          {c.telefone && <div>📞 {c.telefone}</div>}
                          {c.empresa && <div>🏢 {c.empresa}</div>}
                          {!c.telefone && !c.empresa && <span>—</span>}
                        </div>
                      </td>
                      <td>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.fg, whiteSpace: 'nowrap' }}>
                          {cfg.emoji} {STATUS_LABEL[c.status as ContatoStatus]}
                        </span>
                      </td>
                      <td>
                        {c.proximo_contato ? (
                          <span style={{ fontSize: 12.5, fontWeight: 600, color: atrasado ? '#ef4444' : '#22c55e', whiteSpace: 'nowrap' }}>
                            📅 {fmtData(c.proximo_contato)}
                          </span>
                        ) : <span className="dt-sub">—</span>}
                      </td>
                      <td>
                        <div className="dt-actions">
                          <button className="dt-iconbtn" title="Agendar reunião" onClick={e => { e.stopPropagation(); setAgendarPara(c); }}>📅</button>
                          {c.status !== 'convertido' && (
                            <button className="dt-iconbtn" style={{ color: '#22c55e', width: 'auto', padding: '0 8px' }} title="Converter em cliente" onClick={e => { e.stopPropagation(); converterEmCliente(c); }}>→ Cliente</button>
                          )}
                          <button className="dt-iconbtn danger" title="Excluir" onClick={e => excluir(c, e)}>✕</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        /* ── Vista Board (dnd-kit) ── */
        <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${STATUS_ORDER.length}, minmax(180px, 1fr))`,
            gap: 8,
            overflowX: 'auto',
            flex: 1,
            paddingBottom: 8,
          }}>
            {STATUS_ORDER.map(col => (
              <Coluna
                key={col}
                col={col}
                cards={porColuna(col)}
                activeId={activeId}
                donos={isLider ? donos : null}
                onNovo={() => setModalNovo(col)}
                onAbrir={setPerfilAberto}
                onAgendar={setAgendarPara}
              />
            ))}
          </div>
          <DragOverlay dropAnimation={{ duration: 180, easing: 'cubic-bezier(.18,.67,.6,1.22)' }}>
            {activeCard ? <CardLead p={activeCard} overlay /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {/* Drawer perfil */}
      {perfilAberto && (
        <PerfilCliente
          cliente={perfilAberto}
          onClose={() => setPerfilAberto(null)}
          onSaved={carregar}
        />
      )}

      {/* Agendar reunião direto do card */}
      {agendarPara && (
        <AgendarReuniao cliente={agendarPara} onClose={() => setAgendarPara(null)} />
      )}

      {/* Modal novo lead */}
      {modalNovo && (
        <ModalNovoLead
          statusInicial={modalNovo}
          onClose={() => setModalNovo(null)}
          onSaved={() => { setModalNovo(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Board: coluna (droppable) ────────────────────────────────
function Coluna({ col, cards, activeId, donos, onNovo, onAbrir, onAgendar }: {
  col: ContatoStatus;
  cards: Pessoa[];
  activeId: string | null;
  donos: Record<string, string> | null;
  onNovo: () => void;
  onAbrir: (p: Pessoa) => void;
  onAgendar: (p: Pessoa) => void;
}) {
  const cfg = STATUS_CONFIG[col];
  const { setNodeRef, isOver } = useDroppable({ id: col });
  return (
    <div
      ref={setNodeRef}
      style={{
        borderRadius: 10,
        background: isOver ? cfg.bg : 'var(--bg-soft)',
        border: `1px solid ${isOver ? cfg.fg + '80' : 'var(--line)'}`,
        boxShadow: isOver ? `0 0 0 2px ${cfg.fg}30` : 'none',
        transition: 'background .15s, border-color .15s, box-shadow .15s',
        minHeight: 160,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <div style={{ padding: '9px 11px', borderBottom: `2px solid ${cfg.fg}30`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: 12, fontWeight: 700, color: cfg.fg }}>{cfg.emoji} {STATUS_LABEL[col]}</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 999, background: cfg.bg, color: cfg.fg }}>{cards.length}</span>
          <button onClick={onNovo} style={{ width: 18, height: 18, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
        </div>
      </div>
      <div style={{ padding: '6px', display: 'flex', flexDirection: 'column', gap: 5, flex: 1 }}>
        {cards.map(p => (
          <CardLead key={p.id} p={p} dragging={activeId === p.id} dono={donos ? (donos[p.user_id] || '—') : undefined} onAbrir={onAbrir} onAgendar={onAgendar} />
        ))}
        {cards.length === 0 && (
          <div style={{ padding: '16px 6px', textAlign: 'center', color: 'var(--muted)', fontSize: 11, opacity: .5 }}>Arraste aqui</div>
        )}
      </div>
    </div>
  );
}

// ─── Board: card de lead (draggable) ──────────────────────────
function CardLead({ p, dragging, overlay, dono, onAbrir, onAgendar }: {
  p: Pessoa;
  dragging?: boolean;
  overlay?: boolean;
  dono?: string;
  onAbrir?: (p: Pessoa) => void;
  onAgendar?: (p: Pessoa) => void;
}) {
  const { attributes, listeners, setNodeRef } = useDraggable({ id: p.id, disabled: overlay });
  const atrasado = p.proximo_contato && new Date(p.proximo_contato) < new Date();
  return (
    <div
      ref={setNodeRef}
      {...(overlay ? {} : listeners)}
      {...(overlay ? {} : attributes)}
      onClick={() => !overlay && onAbrir?.(p)}
      style={{
        padding: '9px 10px', borderRadius: 7,
        background: 'var(--bg-card)',
        border: `1px solid var(--line)`,
        cursor: overlay ? 'grabbing' : 'grab',
        opacity: dragging ? 0.35 : 1,
        boxShadow: overlay ? 'var(--shadow-lg)' : 'none',
        transform: overlay ? 'rotate(2deg)' : 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 4 }}>
        <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)', marginBottom: 3, flex: 1 }}>{p.nome}</div>
        {onAgendar && (
          <button
            onClick={e => { e.stopPropagation(); onAgendar(p); }}
            onPointerDown={e => e.stopPropagation()}
            title="Agendar reunião"
            style={{ border: 'none', background: 'transparent', cursor: 'pointer', fontSize: 13, padding: 0, lineHeight: 1, flexShrink: 0 }}
          >📅</button>
        )}
      </div>
      {dono && <div style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 600 }}>👤 {dono}</div>}
      {p.empresa && <div style={{ fontSize: 11, color: 'var(--muted)' }}>🏢 {p.empresa}</div>}
      {p.proximo_contato && (
        <div style={{ fontSize: 10.5, marginTop: 4, fontWeight: 600, color: atrasado ? '#ef4444' : '#22c55e' }}>
          ⏰ {fmtData(p.proximo_contato)}
        </div>
      )}
    </div>
  );
}

// ─── Modal novo lead ──────────────────────────────────────────
interface WinnerContato { id: string; nome: string }

function ModalNovoLead({ statusInicial, onClose, onSaved }: { statusInicial: ContatoStatus; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ telefone: '', empresa: '', origem: '', status: statusInicial, proximo_contato: '' });
  const [contatos, setContatos] = useState<WinnerContato[]>([]);
  const [winnerSel, setWinnerSel] = useState<WinnerContato | null>(null);
  const [busca, setBusca] = useState('');
  const [estado, setEstado] = useState<'carregando' | 'ok' | 'desconectado' | 'erro'>('carregando');
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  // Carrega os contatos do W1nner do consultor (somente os "travados" para ele)
  const carregarContatos = useCallback(async () => {
    setEstado('carregando'); setErro('');
    try {
      const res = await fetch('/api/winner/contatos');
      if (res.status === 403) { setEstado('desconectado'); return; }
      const json = await res.json();
      if (json.ok) { setContatos(json.contatos || []); setEstado('ok'); }
      else { setEstado('erro'); setErro(json.error || 'Erro ao buscar contatos do W1nner.'); }
    } catch { setEstado('erro'); setErro('Falha de conexão com o W1nner.'); }
  }, []);

  useEffect(() => { carregarContatos(); }, [carregarContatos]);

  const filtrados = busca
    ? contatos.filter(c => c.nome.toLowerCase().includes(busca.toLowerCase())).slice(0, 30)
    : contatos.slice(0, 30);

  const salvar = async () => {
    if (!winnerSel) { setErro('Selecione um contato do W1nner.'); return; }
    setSaving(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    // Dedup: o contato já existe no CRM?
    const { data: jaExiste } = await supabase
      .from('pessoas')
      .select('id, fase')
      .eq('winner_contact_id', winnerSel.id)
      .maybeSingle();
    if (jaExiste) {
      setErro('Este contato já está cadastrado no CRM.');
      setSaving(false);
      return;
    }

    const { error } = await supabase.from('pessoas').insert({
      nome: winnerSel.nome,
      winner_contact_id: winnerSel.id,
      telefone: form.telefone || null,
      empresa: form.empresa || null,
      origem: form.origem || null,
      status: form.status,
      proximo_contato: form.proximo_contato || null,
      fase: 'lead', user_id: user.id, c1: false, c2: false, c3: false, c4: false,
    });
    if (error) {
      setErro(error.code === '23505' ? 'Este contato já está cadastrado no CRM.' : error.message);
      setSaving(false);
    } else { onSaved(); }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Novo lead</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
          O contato precisa estar cadastrado no <strong>W1nner</strong> primeiro.
        </div>

        {estado === 'carregando' && (
          <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando contatos do W1nner...</div>
        )}

        {estado === 'desconectado' && (
          <div style={{ padding: '14px 16px', borderRadius: 10, background: 'rgba(245,158,11,.08)', border: '1px solid rgba(245,158,11,.3)', color: '#b45309', fontSize: 13, lineHeight: 1.5 }}>
            Conecte sua conta W1nner na aba <strong>Equipe</strong> para cadastrar leads.
          </div>
        )}

        {estado === 'erro' && (
          <div style={errorBox}>{erro || 'Erro ao carregar contatos.'} <button onClick={carregarContatos} style={{ marginLeft: 6, color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', fontSize: 12 }}>Tentar de novo</button></div>
        )}

        {estado === 'ok' && (<>
          {/* Seleção do contato W1nner */}
          {winnerSel ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 12px', borderRadius: 9, background: 'var(--primary-100)', border: '1px solid var(--primary-200)', marginBottom: 12 }}>
              <span style={{ fontSize: 16 }}>🏆</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>{winnerSel.nome}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>W1nner ID: {winnerSel.id}</div>
              </div>
              <button onClick={() => setWinnerSel(null)} style={{ ...btnSmall, color: 'var(--muted)' }}>Trocar</button>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar contato no W1nner..."
                style={{ ...input, marginBottom: 6 }}
                autoFocus
              />
              <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--line)', borderRadius: 9 }}>
                {filtrados.length === 0 ? (
                  <div style={{ padding: 16, textAlign: 'center', color: 'var(--muted)', fontSize: 12.5 }}>
                    {busca ? 'Nenhum contato encontrado.' : 'Nenhum contato no W1nner.'}
                    <div style={{ marginTop: 4 }}>
                      <button onClick={carregarContatos} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 12 }}>↻ Recarregar</button>
                    </div>
                  </div>
                ) : filtrados.map(c => (
                  <button key={c.id} onClick={() => { setWinnerSel(c); setBusca(''); }}
                    style={{ display: 'block', width: '100%', textAlign: 'left', padding: '8px 12px', border: 'none', borderBottom: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}>
                    {c.nome}
                  </button>
                ))}
              </div>
            </div>
          )}

          {winnerSel && (<>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Status" flex>
                <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value as ContatoStatus })} style={input}>
                  {STATUS_ORDER.map(s => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
                </select>
              </Field>
              <Field label="Telefone" flex>
                <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={input} placeholder="(00) 00000-0000" />
              </Field>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Field label="Origem" flex>
                <input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={input} placeholder="Indicação, evento..." />
              </Field>
              <Field label="Próximo contato" flex>
                <input type="date" value={form.proximo_contato} onChange={e => setForm({ ...form, proximo_contato: e.target.value })} style={input} />
              </Field>
            </div>
          </>)}

          {erro && <div style={errorBox}>{erro}</div>}
        </>)}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          {estado === 'ok' && (
            <button onClick={salvar} disabled={saving || !winnerSel} style={{ ...btnPrimary, opacity: (saving || !winnerSel) ? 0.6 : 1 }}>
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Th({ label, k, sortKey, sortDir, onSort }: { label: string; k: SortKey; sortKey: SortKey; sortDir: SortDir; onSort: (k: SortKey) => void }) {
  const active = sortKey === k;
  return (
    <th className="sortable" onClick={() => onSort(k)}>
      {label}
      <span className={`arrow${active ? ' active' : ''}`}>{active ? (sortDir === 'asc' ? '▲' : '▼') : '↕'}</span>
    </th>
  );
}

function Field({ label, children, flex }: { label: string; children: React.ReactNode; flex?: boolean }) {
  return (
    <div style={{ marginBottom: 12, flex: flex ? 1 : undefined }}>
      <div style={labelStyle}>{label}</div>
      <div style={{ marginTop: 5 }}>{children}</div>
    </div>
  );
}

const labelStyle: React.CSSProperties = { fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' };
const input: React.CSSProperties = { width: '100%', padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' };
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const btnSmall: React.CSSProperties = { padding: '4px 9px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', fontSize: 11.5, fontWeight: 600, cursor: 'pointer' };
const pill: React.CSSProperties = { padding: '5px 11px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer' };
const pillActive: React.CSSProperties = { ...pill, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' };
