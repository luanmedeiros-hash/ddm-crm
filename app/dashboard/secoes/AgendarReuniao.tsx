'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa } from '@/lib/types';
import { TIPOS_REUNIAO, TIPO_REUNIAO_LABEL, type TipoReuniao } from '@/lib/prompts-relatorio';

const ORDEM: TipoReuniao[] = ['analise', 'c1', 'c2', 'c3', 'c4', 'acompanhamento'];

const DURACOES = [
  { min: 30, label: '30 min' },
  { min: 60, label: '1 hora' },
  { min: 90, label: '1h30' },
  { min: 120, label: '2 horas' },
];

function addMin(hhmm: string, min: number): string {
  const [h, m] = hhmm.split(':').map(Number);
  const t = new Date(2000, 0, 1, h, m + min);
  return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}`;
}

export default function AgendarReuniao({
  cliente,
  onClose,
  onAgendado,
}: {
  cliente: Pessoa;
  onClose: () => void;
  onAgendado?: () => void;
}) {
  const winnerId = (cliente as Pessoa & { winner_contact_id?: string }).winner_contact_id || '';

  const [tipo, setTipo] = useState<TipoReuniao>(cliente.fase === 'lead' ? 'analise' : 'acompanhamento');
  const [data, setData] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); // amanhã por padrão
    return d.toISOString().slice(0, 10);
  });
  const [hora, setHora] = useState('10:00');
  const [duracao, setDuracao] = useState(90);
  const [usarCalendar, setUsarCalendar] = useState(true);
  const [usarWinner, setUsarWinner] = useState(true);
  const [agendando, setAgendando] = useState(false);
  const [msgs, setMsgs] = useState<{ ok: boolean; texto: string }[]>([]);
  const [concluido, setConcluido] = useState(false);

  // Pré-seleciona o tipo pela jornada (próxima etapa do cliente)
  useEffect(() => {
    if (cliente.fase !== 'cliente') return;
    supabase.from('reunioes').select('tipo').eq('pessoa_id', cliente.id).then(({ data }) => {
      const feitos = new Set((data || []).map((r: { tipo: string }) => r.tipo));
      let maxIdx = -1;
      ORDEM.forEach((t, i) => { if (feitos.has(t)) maxIdx = Math.max(maxIdx, i); });
      const prox = ORDEM[Math.min(maxIdx + 1, ORDEM.length - 1)];
      setTipo(prox);
    });
  }, [cliente.id, cliente.fase]);

  const horaFim = addMin(hora, duracao);

  const agendar = async () => {
    if (!usarCalendar && !usarWinner) { setMsgs([{ ok: false, texto: 'Selecione ao menos um destino.' }]); return; }
    setAgendando(true); setMsgs([]);
    const resultados: { ok: boolean; texto: string }[] = [];

    const chamadas: Promise<void>[] = [];

    if (usarWinner) {
      chamadas.push((async () => {
        try {
          const res = await fetch('/api/winner/agendar', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              tipo, dataInicio: data, horaInicio: hora, dataFim: data, horaFim,
              winnerContactId: winnerId || undefined,
            }),
          });
          const json = await res.json();
          resultados.push(json.ok
            ? { ok: true, texto: '🏆 Lançado no W1nner' }
            : { ok: false, texto: `W1nner: ${json.message || json.error || 'erro'}` });
        } catch { resultados.push({ ok: false, texto: 'W1nner: falha de conexão' }); }
      })());
    }

    if (usarCalendar) {
      chamadas.push((async () => {
        try {
          const startIso = `${data}T${hora}:00-03:00`;
          const endIso = `${data}T${horaFim}:00-03:00`;
          const res = await fetch('/api/calendar/create', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              summary: `${TIPO_REUNIAO_LABEL[tipo]} — ${cliente.nome}`,
              startIso, endIso,
              attendeeEmails: cliente.email ? [cliente.email] : [],
            }),
          });
          const json = await res.json();
          resultados.push(json.ok
            ? { ok: true, texto: '📅 Criado no Google Calendar' }
            : { ok: false, texto: `Calendar: ${json.message || json.error || 'erro'}` });
        } catch { resultados.push({ ok: false, texto: 'Calendar: falha de conexão' }); }
      })());
    }

    await Promise.all(chamadas);
    setMsgs(resultados);
    setAgendando(false);
    if (resultados.every(r => r.ok)) {
      setConcluido(true);
      onAgendado?.();
    }
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
          <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>📅 Agendar reunião</div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 16 }}>Com {cliente.nome}</div>

        <Field label="Tipo">
          <select value={tipo} onChange={e => setTipo(e.target.value as TipoReuniao)} style={input}>
            {TIPOS_REUNIAO.map(t => <option key={t} value={t}>{TIPO_REUNIAO_LABEL[t]}</option>)}
          </select>
        </Field>

        <div style={{ display: 'flex', gap: 10 }}>
          <Field label="Data" flex>
            <input type="date" value={data} onChange={e => setData(e.target.value)} style={input} />
          </Field>
          <Field label="Hora">
            <input type="time" value={hora} onChange={e => setHora(e.target.value)} style={{ ...input, width: 100 }} />
          </Field>
          <Field label="Duração">
            <select value={duracao} onChange={e => setDuracao(Number(e.target.value))} style={{ ...input, width: 100 }}>
              {DURACOES.map(d => <option key={d.min} value={d.min}>{d.label}</option>)}
            </select>
          </Field>
        </div>

        <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: -4, marginBottom: 14 }}>
          {data.split('-').reverse().join('/')} · {hora} às {horaFim}
        </div>

        {/* Destinos */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
          <Toggle ativo={usarCalendar} onToggle={() => setUsarCalendar(v => !v)} emoji="📅" label="Google Calendar" />
          <Toggle ativo={usarWinner} onToggle={() => setUsarWinner(v => !v)} emoji="🏆" label="W1nner"
            aviso={usarWinner && !winnerId ? 'Sem ID do W1nner — lançado sem contato vinculado' : undefined} />
        </div>

        {/* Resultados */}
        {msgs.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
            {msgs.map((m, i) => (
              <div key={i} style={{
                padding: '8px 12px', borderRadius: 8, fontSize: 12.5,
                background: m.ok ? 'rgba(34,197,94,.08)' : 'rgba(239,68,68,.08)',
                border: `1px solid ${m.ok ? 'rgba(34,197,94,.25)' : 'rgba(239,68,68,.25)'}`,
                color: m.ok ? '#16a34a' : '#ef4444',
              }}>{m.texto}</div>
            ))}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
          <button onClick={onClose} style={btnGhost}>{concluido ? 'Fechar' : 'Cancelar'}</button>
          {!concluido && (
            <button onClick={agendar} disabled={agendando} style={{ ...btnPrimary, opacity: agendando ? 0.7 : 1 }}>
              {agendando ? 'Agendando...' : 'Agendar'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({ ativo, onToggle, emoji, label, aviso }: { ativo: boolean; onToggle: () => void; emoji: string; label: string; aviso?: string }) {
  return (
    <div>
      <button onClick={onToggle} style={{
        display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '10px 12px',
        borderRadius: 9, cursor: 'pointer', textAlign: 'left',
        border: `1px solid ${ativo ? 'var(--primary)' : 'var(--line)'}`,
        background: ativo ? 'var(--primary-100)' : 'var(--bg-soft)',
      }}>
        <span style={{ fontSize: 17 }}>{emoji}</span>
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: ativo ? 'var(--primary-bright)' : 'var(--text)' }}>{label}</span>
        <span style={{
          width: 36, height: 20, borderRadius: 999, position: 'relative', flexShrink: 0,
          background: ativo ? 'var(--primary)' : 'var(--line-2)', transition: 'background .15s',
        }}>
          <span style={{ position: 'absolute', top: 2, left: ativo ? 18 : 2, width: 16, height: 16, borderRadius: 999, background: '#fff', transition: 'left .15s' }} />
        </span>
      </button>
      {aviso && <div style={{ fontSize: 11, color: '#d97706', marginTop: 3, paddingLeft: 4 }}>⚠️ {aviso}</div>}
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
const btnPrimary: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer' };
const btnClose: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 };
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 440, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)' };
