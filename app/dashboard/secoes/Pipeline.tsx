'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa, ContatoStatus } from '@/lib/types';
import PerfilCliente from './PerfilCliente';

// ─── Colunas do pipeline ──────────────────────────────────────
interface Coluna {
  key: ContatoStatus;
  label: string;
  cor: string;
  corBg: string;
  emoji: string;
}

const COLUNAS: Coluna[] = [
  { key: 'novo',              label: 'Novo',              emoji: '🌱', cor: '#6366f1', corBg: 'rgba(99,102,241,.1)'  },
  { key: 'contatado',         label: 'Contatado',         emoji: '📞', cor: '#F59E0B', corBg: 'rgba(245,158,11,.1)'  },
  { key: 'reuniao_agendada',  label: 'Reunião Agendada',  emoji: '📅', cor: '#22c55e', corBg: 'rgba(34,197,94,.1)'   },
  { key: 'convertido',        label: 'Cliente',           emoji: '🏆', cor: '#4a90c8', corBg: 'rgba(74,144,200,.1)'  },
  { key: 'perdido',           label: 'Perdido',           emoji: '❌', cor: '#9ca3af', corBg: 'rgba(156,163,175,.1)' },
];

function fmtData(iso: string | null) {
  if (!iso) return '';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

// ─── Componente principal ─────────────────────────────────────
export default function Pipeline() {
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overCol, setOverCol] = useState<ContatoStatus | null>(null);
  const [modalNovo, setModalNovo] = useState<ContatoStatus | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'lead')
      .order('created_at', { ascending: false });
    setPessoas((data as Pessoa[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  // Mover card entre colunas
  const moverPara = useCallback(async (pessoaId: string, novoStatus: ContatoStatus) => {
    setPessoas(prev => prev.map(p => p.id === pessoaId ? { ...p, status: novoStatus } : p));
    await supabase.from('pessoas').update({ status: novoStatus, updated_at: new Date().toISOString() }).eq('id', pessoaId);
  }, []);

  // Drag handlers
  const onDragStart = (id: string) => setDragId(id);
  const onDragEnd = () => { setDragId(null); setOverCol(null); };
  const onDragOver = (e: React.DragEvent, col: ContatoStatus) => { e.preventDefault(); setOverCol(col); };
  const onDrop = (e: React.DragEvent, col: ContatoStatus) => {
    e.preventDefault();
    if (dragId) moverPara(dragId, col);
    setDragId(null); setOverCol(null);
  };

  const filtradas = busca
    ? pessoas.filter(p => p.nome.toLowerCase().includes(busca.toLowerCase()))
    : pessoas;

  const porColuna = (key: ContatoStatus) => filtradas.filter(p => p.status === key);

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>;

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Barra de busca */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
        <input
          value={busca}
          onChange={e => setBusca(e.target.value)}
          placeholder="Buscar contato..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13 }}
        />
        <div style={{ fontSize: 12.5, color: 'var(--muted)', whiteSpace: 'nowrap' }}>
          {filtradas.length} contato{filtradas.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Board */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: `repeat(${COLUNAS.length}, minmax(200px, 1fr))`,
        gap: 10,
        overflowX: 'auto',
        flex: 1,
        paddingBottom: 12,
      }}>
        {COLUNAS.map(col => {
          const cards = porColuna(col.key);
          const isOver = overCol === col.key;

          return (
            <div
              key={col.key}
              onDragOver={e => onDragOver(e, col.key)}
              onDrop={e => onDrop(e, col.key)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 0,
                borderRadius: 12,
                background: isOver ? col.corBg : 'var(--bg-soft)',
                border: `1px solid ${isOver ? col.cor + '60' : 'var(--line)'}`,
                transition: 'all .15s',
                minHeight: 200,
              }}
            >
              {/* Header da coluna */}
              <div style={{
                padding: '10px 12px',
                borderBottom: `2px solid ${col.cor}30`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <span style={{ fontSize: 14 }}>{col.emoji}</span>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: col.cor }}>{col.label}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, padding: '1px 7px', borderRadius: 999,
                    background: col.corBg, color: col.cor,
                  }}>
                    {cards.length}
                  </span>
                  <button
                    onClick={() => setModalNovo(col.key)}
                    title="Adicionar contato"
                    style={{ width: 20, height: 20, borderRadius: 4, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 16, lineHeight: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >+</button>
                </div>
              </div>

              {/* Cards */}
              <div style={{ padding: '8px 8px', display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                {cards.map(p => (
                  <CardPessoa
                    key={p.id}
                    pessoa={p}
                    cor={col.cor}
                    isDragging={dragId === p.id}
                    onDragStart={() => onDragStart(p.id)}
                    onDragEnd={onDragEnd}
                    onClick={() => setPerfilAberto(p)}
                  />
                ))}

                {cards.length === 0 && (
                  <div style={{ padding: '20px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 12, opacity: 0.6 }}>
                    Arraste um card aqui
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Drawer perfil */}
      {perfilAberto && (
        <PerfilCliente
          cliente={perfilAberto}
          onClose={() => setPerfilAberto(null)}
          onSaved={() => { carregar(); }}
        />
      )}

      {/* Modal novo contato rápido */}
      {modalNovo && (
        <ModalNovoContato
          statusInicial={modalNovo}
          onClose={() => setModalNovo(null)}
          onSaved={() => { setModalNovo(null); carregar(); }}
        />
      )}
    </div>
  );
}

// ─── Card de pessoa ───────────────────────────────────────────
function CardPessoa({
  pessoa, cor, isDragging, onDragStart, onDragEnd, onClick,
}: {
  pessoa: Pessoa;
  cor: string;
  isDragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClick: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onClick={onClick}
      style={{
        padding: '10px 11px',
        borderRadius: 8,
        background: isDragging ? 'var(--bg-soft)' : 'var(--bg-card)',
        border: `1px solid ${isDragging ? cor + '60' : 'var(--line)'}`,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        transform: isDragging ? 'rotate(1.5deg)' : 'none',
        transition: 'box-shadow .15s, opacity .15s',
        boxShadow: isDragging ? `0 4px 16px ${cor}30` : 'none',
        userSelect: 'none',
      }}
    >
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4, lineHeight: 1.3 }}>
        {pessoa.nome}
      </div>

      {(pessoa.empresa || pessoa.telefone) && (
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginBottom: 4, display: 'flex', flexDirection: 'column', gap: 1 }}>
          {pessoa.empresa && <span>🏢 {pessoa.empresa}</span>}
          {pessoa.telefone && <span>📞 {pessoa.telefone}</span>}
        </div>
      )}

      {pessoa.origem && (
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 2 }}>
          Origem: {pessoa.origem}
        </div>
      )}

      {pessoa.proximo_contato && (
        <div style={{
          marginTop: 6, fontSize: 10.5, fontWeight: 600,
          color: new Date(pessoa.proximo_contato) < new Date() ? '#ef4444' : '#22c55e',
          display: 'flex', alignItems: 'center', gap: 3,
        }}>
          📅 {fmtData(pessoa.proximo_contato)}
        </div>
      )}
    </div>
  );
}

// ─── Modal novo contato rápido ────────────────────────────────
function ModalNovoContato({
  statusInicial,
  onClose,
  onSaved,
}: {
  statusInicial: ContatoStatus;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({ nome: '', telefone: '', empresa: '', origem: '', status: statusInicial });
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');

  const salvar = async () => {
    if (!form.nome.trim()) { setErro('Nome é obrigatório.'); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setSaving(false); return; }

    const { error } = await supabase.from('pessoas').insert({
      nome: form.nome.trim(),
      telefone: form.telefone || null,
      empresa: form.empresa || null,
      origem: form.origem || null,
      status: form.status,
      fase: 'lead',
      user_id: user.id,
      c1: false, c2: false, c3: false, c4: false,
    });

    if (error) { setErro(error.message); setSaving(false); }
    else { onSaved(); }
  };

  const coluna = COLUNAS.find(c => c.key === statusInicial);

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Novo contato</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>
          Coluna: {coluna?.emoji} {coluna?.label}
        </div>

        <Field label="Nome *">
          <input value={form.nome} onChange={e => setForm({ ...form, nome: e.target.value })} style={input} placeholder="Nome do contato" autoFocus />
        </Field>
        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Telefone" flex>
            <input value={form.telefone} onChange={e => setForm({ ...form, telefone: e.target.value })} style={input} placeholder="(00) 00000-0000" />
          </Field>
          <Field label="Empresa" flex>
            <input value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} style={input} placeholder="Empresa" />
          </Field>
        </div>
        <Field label="Origem">
          <input value={form.origem} onChange={e => setForm({ ...form, origem: e.target.value })} style={input} placeholder="Indicação, evento, LinkedIn..." />
        </Field>

        {erro && <div style={errorBox}>{erro}</div>}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
          <button onClick={onClose} style={btnGhost}>Cancelar</button>
          <button onClick={salvar} disabled={saving} style={{ ...btnPrimary, opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Salvando...' : 'Adicionar'}
          </button>
        </div>
      </div>
    </div>
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
const errorBox: React.CSSProperties = { padding: '9px 12px', background: 'rgba(74,144,200,.08)', border: '1px solid rgba(74,144,200,.2)', borderRadius: 8, color: '#4a90c8', fontSize: 12.5, marginBottom: 12 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,.55)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' };
