'use client';

/**
 * AgendaConsultor — componente para a tela /daily do consultor.
 *
 * - Botão "Sincronizar" chama POST /api/calendar/sync
 * - Lista eventos dos próximos 30 dias do Supabase
 * - Permite vincular nome do lead + notas a cada evento
 * - Exibe botões futuros: Briefing, Transcrição, Relatório, Follow-up (desabilitados)
 */

import React, { useCallback, useEffect, useState } from 'react';
import type { CalendarEventDB } from '@/lib/types';

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

// ─── tipos locais ──────────────────────────────────────────────────────────────

interface LinkModalState {
  event: CalendarEventDB;
  lead_nome: string;
  lead_notas: string;
  saving: boolean;
}

// ─── helpers de data/hora ──────────────────────────────────────────────────────

function fmtTime(iso: string): string {
  if (!iso || iso.length <= 10) return '—';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDayLabel(iso: string): string {
  const d = new Date(iso);
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function groupByDay(events: CalendarEventDB[]): Map<string, CalendarEventDB[]> {
  const map = new Map<string, CalendarEventDB[]>();
  for (const ev of events) {
    const day = ev.start_at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }
  return map;
}

// ─── Subcomponente: botões futuros ─────────────────────────────────────────────

function FutureButtons({ ev }: { ev: CalendarEventDB }) {
  const btn = (label: string, icon: string, done: boolean, tip: string) => (
    <button
      key={label}
      disabled
      title={tip}
      style={{
        padding: '4px 10px',
        borderRadius: 6,
        border: `1px solid ${done ? 'rgba(34,197,94,.4)' : 'var(--line)'}`,
        background: done ? 'rgba(34,197,94,.08)' : 'var(--bg-soft)',
        color: done ? '#22c55e' : 'var(--muted)',
        fontSize: 11,
        fontWeight: 600,
        cursor: 'not-allowed',
        opacity: done ? 1 : 0.55,
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {done && <span style={{ fontSize: 9, background: '#22c55e', color: '#fff', borderRadius: 4, padding: '1px 4px' }}>✓</span>}
    </button>
  );

  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 8 }}>
      {btn('Briefing',    '📋', ev.briefing_gerado,   'Gerar briefing da reunião (em breve)')}
      {btn('Transcrição', '🎙️', !!ev.transcricao_url, 'Adicionar transcrição (em breve)')}
      {btn('Relatório',   '📄', ev.relatorio_gerado,  'Gerar relatório (em breve)')}
      {btn('Follow-up',   '✉️', ev.followup_gerado,   'Gerar follow-up (em breve)')}
    </div>
  );
}

// ─── Subcomponente: card de evento ─────────────────────────────────────────────

function EventCard({
  ev,
  onLinkClick,
}: {
  ev: CalendarEventDB;
  onLinkClick: (ev: CalendarEventDB) => void;
}) {
  const guests = (ev.attendees || []).filter((a) => !a.self && a.email);
  const hasLead = !!ev.lead_nome;

  return (
    <div
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: 'var(--bg)',
        border: `1px solid ${hasLead ? 'rgba(99,102,241,.35)' : 'var(--line)'}`,
        display: 'flex',
        flexDirection: 'column',
        gap: 6,
        transition: 'border-color .15s',
      }}
    >
      {/* linha principal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* horário */}
        <div style={{ minWidth: 72, fontSize: 11.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums', lineHeight: 1.8 }}>
          {ev.is_all_day ? 'Dia todo' : `${fmtTime(ev.start_at)} – ${fmtTime(ev.end_at)}`}
        </div>

        {/* corpo */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {ev.summary}
          </div>

          {ev.location && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2 }}>📍 {ev.location}</div>
          )}

          {ev.hangout_link && (
            <div style={{ fontSize: 11.5, marginTop: 2 }}>
              <a href={ev.hangout_link} target="_blank" rel="noopener noreferrer"
                style={{ color: 'var(--primary)', textDecoration: 'none', fontWeight: 600 }}>
                🎥 Google Meet
              </a>
            </div>
          )}

          {guests.length > 0 && (
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3, display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              <span>👥</span>
              {guests.slice(0, 4).map(g => (
                <span key={g.email} style={{
                  padding: '1px 7px', borderRadius: 12,
                  background: g.responseStatus === 'accepted' ? 'rgba(34,197,94,.1)' : 'var(--bg-soft)',
                  border: '1px solid var(--line)',
                }}>
                  {g.displayName || g.email.split('@')[0]}
                </span>
              ))}
              {guests.length > 4 && <span style={{ color: 'var(--muted)' }}>+{guests.length - 4}</span>}
            </div>
          )}

          {/* vinculação ao lead */}
          {hasLead ? (
            <div style={{ marginTop: 6, padding: '6px 10px', borderRadius: 8, background: 'rgba(99,102,241,.07)', border: '1px solid rgba(99,102,241,.2)', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
              <span style={{ fontSize: 13 }}>👤</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--text)' }}>{ev.lead_nome}</div>
                {ev.lead_notas && (
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 2, lineHeight: 1.4 }}>{ev.lead_notas}</div>
                )}
              </div>
              <button
                onClick={() => onLinkClick(ev)}
                style={{ fontSize: 10, padding: '2px 8px', borderRadius: 6, border: '1px solid rgba(99,102,241,.3)', background: 'transparent', color: '#818cf8', cursor: 'pointer', fontWeight: 600, flexShrink: 0 }}
              >
                Editar
              </button>
            </div>
          ) : (
            <button
              onClick={() => onLinkClick(ev)}
              style={{ marginTop: 6, padding: '4px 10px', borderRadius: 6, border: '1px dashed var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 11.5, fontWeight: 500 }}
            >
              + Vincular lead
            </button>
          )}

          <FutureButtons ev={ev} />
        </div>
      </div>
    </div>
  );
}

// ─── Modal de vinculação ───────────────────────────────────────────────────────

function LinkModal({
  state,
  onChange,
  onSave,
  onClose,
}: {
  state: LinkModalState;
  onChange: (patch: Partial<LinkModalState>) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <div
      onClick={onClose}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{ background: 'var(--bg)', borderRadius: 14, padding: 24, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,.3)', border: '1px solid var(--line)' }}
      >
        <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 4, color: 'var(--text)' }}>Vincular lead</div>
        <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 18, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {state.event.summary}
        </div>

        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Nome do lead / cliente
        </label>
        <input
          value={state.lead_nome}
          onChange={e => onChange({ lead_nome: e.target.value })}
          placeholder="Ex: João Silva"
          style={{ width: '100%', marginTop: 6, marginBottom: 14, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, boxSizing: 'border-box' }}
        />

        <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px' }}>
          Notas / observações
        </label>
        <textarea
          value={state.lead_notas}
          onChange={e => onChange({ lead_notas: e.target.value })}
          placeholder="Contexto da reunião, objetivo, próximos passos..."
          rows={3}
          style={{ width: '100%', marginTop: 6, marginBottom: 20, padding: '9px 12px', borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-soft)', color: 'var(--text)', fontSize: 13, resize: 'vertical', boxSizing: 'border-box', fontFamily: 'inherit' }}
        />

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          {state.lead_nome && (
            <button
              onClick={() => onChange({ lead_nome: '', lead_notas: '' })}
              style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}
            >
              Remover vínculo
            </button>
          )}
          <button
            onClick={onClose}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13 }}
          >
            Cancelar
          </button>
          <button
            onClick={onSave}
            disabled={state.saving}
            style={{ padding: '8px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', cursor: state.saving ? 'not-allowed' : 'pointer', fontSize: 13, fontWeight: 700, opacity: state.saving ? .7 : 1 }}
          >
            {state.saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ──────────────────────────────────────────────────────

interface Props {
  userId: string;
}

export default function AgendaConsultor({ userId }: Props) {
  const [events, setEvents] = useState<CalendarEventDB[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const [toast, setToast] = useState<{ msg: string; error?: boolean } | null>(null);
  const [modal, setModal] = useState<LinkModalState | null>(null);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  // Carrega eventos do Supabase
  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/calendar/events');
      const json = await res.json();
      if (json.ok) {
        setEvents(json.events || []);
        if (json.events?.length > 0) {
          const latest = [...json.events].sort((a: CalendarEventDB, b: CalendarEventDB) =>
            b.synced_at.localeCompare(a.synced_at)
          )[0];
          setLastSync(latest.synced_at);
        }
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadEvents(); }, [loadEvents]);

  // Sincroniza com Google Calendar
  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await fetch('/api/calendar/sync', { method: 'POST' });
      const json = await res.json();
      if (json.ok) {
        showToast(`✓ ${json.upserted} evento${json.upserted !== 1 ? 's' : ''} sincronizado${json.upserted !== 1 ? 's' : ''}`);
        await loadEvents();
      } else {
        showToast(json.message || json.error || 'Erro na sincronização', true);
      }
    } catch {
      showToast('Falha na conexão', true);
    } finally {
      setSyncing(false);
    }
  };

  // Abre modal de vinculação
  const handleLinkClick = (ev: CalendarEventDB) => {
    setModal({ event: ev, lead_nome: ev.lead_nome || '', lead_notas: ev.lead_notas || '', saving: false });
  };

  // Salva vinculação
  const handleLinkSave = async () => {
    if (!modal) return;
    setModal(prev => prev ? { ...prev, saving: true } : null);

    try {
      const res = await fetch('/api/calendar/events', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: modal.event.id,
          userId,
          lead_nome: modal.lead_nome || null,
          lead_notas: modal.lead_notas || null,
        }),
      });
      const json = await res.json();
      if (json.ok) {
        showToast('✓ Vínculo salvo');
        setEvents(prev => prev.map(ev =>
          ev.id === modal.event.id
            ? { ...ev, lead_nome: modal.lead_nome || null, lead_notas: modal.lead_notas || null }
            : ev
        ));
        setModal(null);
      } else {
        showToast(json.error || 'Erro ao salvar', true);
        setModal(prev => prev ? { ...prev, saving: false } : null);
      }
    } catch {
      showToast('Falha na conexão', true);
      setModal(prev => prev ? { ...prev, saving: false } : null);
    }
  };

  const byDay = groupByDay(events);
  const sortedDays = Array.from(byDay.keys()).sort();

  const linkedCount = events.filter(e => e.lead_nome).length;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 10 }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
            📅 Agenda — próximos 30 dias
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
            {events.length} evento{events.length !== 1 ? 's' : ''}
            {linkedCount > 0 && <> · <span style={{ color: '#818cf8' }}>{linkedCount} vinculado{linkedCount !== 1 ? 's' : ''} a lead</span></>}
            {lastSync && (
              <> · sincronizado {new Date(lastSync).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}</>
            )}
          </div>
        </div>

        <button
          onClick={handleSync}
          disabled={syncing}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: '1px solid var(--line)',
            background: syncing ? 'var(--bg-soft)' : 'var(--primary)',
            color: syncing ? 'var(--muted)' : '#fff',
            cursor: syncing ? 'not-allowed' : 'pointer',
            fontSize: 13,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            gap: 7,
            transition: 'all .15s',
          }}
        >
          <span style={{ display: 'inline-block', animation: syncing ? 'spin 1s linear infinite' : 'none' }}>🔄</span>
          {syncing ? 'Sincronizando...' : 'Sincronizar Google'}
        </button>
      </div>

      {/* Estados */}
      {loading && (
        <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Carregando agenda...
        </div>
      )}

      {!loading && events.length === 0 && (
        <div style={{ padding: 32, textAlign: 'center', borderRadius: 12, border: '1px dashed var(--line)', background: 'var(--bg-soft)' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>📭</div>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Nenhum evento sincronizado</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
            Clique em <strong>Sincronizar Google</strong> para importar sua agenda dos próximos 30 dias.
          </div>
        </div>
      )}

      {/* Lista por dia */}
      {!loading && sortedDays.map(day => (
        <div key={day}>
          <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 8, paddingBottom: 6, borderBottom: '1px solid var(--line)' }}>
            {fmtDayLabel(day + 'T12:00:00')}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {byDay.get(day)!.map(ev => (
              <EventCard key={ev.id} ev={ev} onLinkClick={handleLinkClick} />
            ))}
          </div>
        </div>
      ))}

      {/* Modal */}
      {modal && (
        <LinkModal
          state={modal}
          onChange={patch => setModal(prev => prev ? { ...prev, ...patch } : null)}
          onSave={handleLinkSave}
          onClose={() => setModal(null)}
        />
      )}

      {/* Toast */}
      {toast && (
        <div style={{
          position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)',
          background: toast.error ? '#ef4444' : '#0f172a',
          color: '#fff', padding: '10px 20px', borderRadius: 10,
          fontSize: 13, fontWeight: 600, zIndex: 99999,
          boxShadow: '0 8px 32px rgba(0,0,0,.3)',
        }}>
          {toast.msg}
        </div>
      )}

      {/* CSS para spin */}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
