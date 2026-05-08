'use client';

import React, { useEffect, useState } from 'react';
import type { CalendarEvent } from '@/lib/google-calendar';

interface WeekData {
  ok: boolean;
  range: { from: string; to: string };
  weeks: { consultor: string; email: string; events: CalendarEvent[] }[];
  warnings?: string[];
}

interface Props {
  /** Filtra a agenda de um consultor específico. Se vazio + isLider+todos, lista todos. */
  consultor?: string;
  /** Modo "todos os consultores" (só líder). */
  todos?: boolean;
  /** Mostra cabeçalho com label/título. */
  showHeader?: boolean;
}

const DIAS_SEMANA = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
const MESES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

export default function AgendaSemanal({ consultor, todos, showHeader = true }: Props) {
  const [data, setData] = useState<WeekData | null>(null);
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancel = false;
    setLoading(true);
    setError('');

    const params = new URLSearchParams();
    if (consultor) params.set('consultor', consultor);
    if (todos) params.set('todos', '1');

    fetch(`/api/calendar/week${params.toString() ? '?' + params.toString() : ''}`)
      .then(r => r.json())
      .then(json => {
        if (cancel) return;
        if (!json.ok) {
          setError(json.error || 'Erro ao carregar agenda');
        } else {
          setData(json);
        }
      })
      .catch(e => { if (!cancel) setError(String(e)); })
      .finally(() => { if (!cancel) setLoading(false); });

    return () => { cancel = true; };
  }, [consultor, todos]);

  if (loading) {
    return <div className="agenda-empty">Carregando agenda...</div>;
  }

  if (error) {
    return <div className="agenda-empty agenda-error">⚠️ {error}</div>;
  }

  if (!data || data.weeks.length === 0) {
    return <div className="agenda-empty">Nenhum consultor encontrado.</div>;
  }

  // Achata todos os eventos com label do consultor, ordenado por data
  const allEvents: (CalendarEvent & { _consultor: string })[] = [];
  for (const w of data.weeks) {
    for (const ev of w.events) {
      allEvents.push({ ...ev, _consultor: w.consultor });
    }
  }
  allEvents.sort((a, b) => a.start.localeCompare(b.start));

  // Agrupa por dia
  const byDay = new Map<string, typeof allEvents>();
  for (const ev of allEvents) {
    const d = ev.start.slice(0, 10); // YYYY-MM-DD
    if (!byDay.has(d)) byDay.set(d, []);
    byDay.get(d)!.push(ev);
  }
  const sortedDays = Array.from(byDay.keys()).sort();

  return (
    <div className="agenda-wrap">
      {showHeader && (
        <div className="agenda-header">
          <div className="agenda-title">
            📅 Agenda da semana
            <span className="agenda-range">{formatRange(data.range.from, data.range.to)}</span>
          </div>
          <div className="agenda-count">{allEvents.length} {allEvents.length === 1 ? 'evento' : 'eventos'}</div>
        </div>
      )}

      {data.warnings && data.warnings.length > 0 && (
        <div className="agenda-warning">
          {data.warnings.length === 1
            ? `⚠️ ${data.warnings[0]}`
            : `⚠️ ${data.warnings.length} consultores sem token. Eles precisam fazer login com Google.`}
        </div>
      )}

      {allEvents.length === 0 ? (
        <div className="agenda-empty">Sem eventos na semana atual.</div>
      ) : (
        <div className="agenda-days">
          {sortedDays.map(d => (
            <div key={d} className="agenda-day">
              <div className="agenda-day-label">{formatDay(d)}</div>
              <div className="agenda-day-events">
                {byDay.get(d)!.map(ev => (
                  <EventCard key={ev.id + ev._consultor} ev={ev} showConsultor={!!todos} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function EventCard({ ev, showConsultor }: { ev: CalendarEvent & { _consultor: string }; showConsultor: boolean }) {
  const startTime = formatTime(ev.start);
  const endTime = formatTime(ev.end);

  // Filtra attendees: tira o próprio dono (self) e mantém só convidados externos
  const guests = ev.attendees.filter(a => !a.self && a.email);

  return (
    <div className={`agenda-event ${ev.status === 'tentative' ? 'tentative' : ''}`}>
      <div className="agenda-event-time">
        <span className="t-start">{startTime}</span>
        <span className="t-sep">–</span>
        <span className="t-end">{endTime}</span>
      </div>
      <div className="agenda-event-body">
        <div className="agenda-event-title">{ev.summary}</div>
        {showConsultor && (
          <div className="agenda-event-consultor">👤 {ev._consultor}</div>
        )}
        {ev.location && (
          <div className="agenda-event-loc">📍 {ev.location}</div>
        )}
        {ev.hangoutLink && (
          <div className="agenda-event-loc">
            <a href={ev.hangoutLink} target="_blank" rel="noopener noreferrer" className="agenda-event-link">
              🎥 Google Meet
            </a>
          </div>
        )}
        {guests.length > 0 && (
          <div className="agenda-event-guests">
            <span className="agenda-guests-label">Convidados:</span>
            {guests.slice(0, 3).map(g => (
              <span key={g.email} className={`agenda-guest status-${g.responseStatus || 'needsAction'}`}>
                {g.displayName || g.email}
              </span>
            ))}
            {guests.length > 3 && (
              <span className="agenda-guest-more">+{guests.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(iso: string): string {
  // All-day event: vem como "YYYY-MM-DD"
  if (iso.length <= 10) return '—';
  const d = new Date(iso);
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(yyyymmdd: string): string {
  const [y, m, d] = yyyymmdd.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const dow = DIAS_SEMANA[date.getDay()];
  return `${dow}, ${d} ${MESES[m - 1]}`;
}

function formatRange(fromIso: string, toIso: string): string {
  const f = new Date(fromIso);
  const t = new Date(toIso);
  return `${f.getDate()} ${MESES[f.getMonth()]} – ${t.getDate()} ${MESES[t.getMonth()]}`;
}
