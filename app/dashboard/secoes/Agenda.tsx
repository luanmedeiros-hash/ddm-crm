'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { CalendarEventDB, Pessoa } from '@/lib/types';
import { TIPOS_REUNIAO, TIPO_REUNIAO_LABEL, type TipoReuniao } from '@/lib/prompts-relatorio';

// ─── helpers ──────────────────────────────────────────────────────────────────

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'];
const DIAS  = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];

function fmtTime(iso: string) {
  if (!iso || iso.length <= 10) return 'Dia todo';
  return new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

function fmtDay(iso: string) {
  const d = new Date(iso + (iso.length <= 10 ? 'T12:00:00' : ''));
  return `${DIAS[d.getDay()]}, ${d.getDate()} ${MESES[d.getMonth()]}`;
}

function groupByDay(events: (CalendarEventDB & { _consultor?: string })[]) {
  const map = new Map<string, (CalendarEventDB & { _consultor?: string })[]>();
  for (const ev of events) {
    const day = ev.start_at.slice(0, 10);
    if (!map.has(day)) map.set(day, []);
    map.get(day)!.push(ev);
  }
  return map;
}

// ─── Modal de vinculação ──────────────────────────────────────────────────────

interface LinkState {
  ev: CalendarEventDB & { _consultor?: string };
  userId: string;
  lead_id: string;       // '' = nenhum
  lead_notas: string;
  saving: boolean;
}

function LinkModal({ s, pessoas, onChange, onSave, onClose }: { s: LinkState; pessoas: Pessoa[]; onChange: (p: Partial<LinkState>) => void; onSave: () => void; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%', maxWidth:420, boxShadow:'0 20px 60px rgba(0,0,0,.3)', border:'1px solid var(--line)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4 }}>Vincular pessoa</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:18, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.ev.summary}</div>
        <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>Pessoa</label>
        <select value={s.lead_id} onChange={e => onChange({ lead_id: e.target.value })}
          style={{ width:'100%', marginTop:6, marginBottom:14, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-soft)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}>
          <option value="">— Nenhuma —</option>
          {pessoas.map(p => (
            <option key={p.id} value={p.id}>
              {p.nome}{p.fase === 'cliente' ? ' (cliente)' : ' (lead)'}
            </option>
          ))}
        </select>
        {pessoas.length === 0 && (
          <div style={{ fontSize:11.5, color:'var(--muted)', marginTop:-8, marginBottom:14 }}>
            Nenhuma pessoa cadastrada. Adicione em Contatos ou Clientes primeiro.
          </div>
        )}
        <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>Notas</label>
        <textarea value={s.lead_notas} onChange={e => onChange({ lead_notas: e.target.value })} rows={3} placeholder="Contexto, objetivo, próximos passos..."
          style={{ width:'100%', marginTop:6, marginBottom:20, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-soft)', color:'var(--text)', fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />
        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          {s.lead_id && <button onClick={() => onChange({ lead_id:'', lead_notas:'' })} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:13 }}>Remover</button>}
          <button onClick={onClose} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13 }}>Cancelar</button>
          <button onClick={onSave} disabled={s.saving} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'var(--primary)', color:'#fff', cursor:s.saving?'not-allowed':'pointer', fontSize:13, fontWeight:700, opacity:s.saving?.7:1 }}>
            {s.saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── RelatorioState + Modal ───────────────────────────────────

interface RelatorioState {
  ev: CalendarEventDB & { _consultor?: string };
  tipo: TipoReuniao;
  transcricao: string;
  relatorio: string;
  gerando: boolean;
}

function RelatorioModal({ s, onChange, onGerar, onClose }: { s: RelatorioState; onChange: (p: Partial<RelatorioState>) => void; onGerar: () => void; onClose: () => void }) {
  const semVinculo = !s.ev.lead_id;
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,.55)', zIndex:9999, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }}>
      <div onClick={e => e.stopPropagation()} style={{ background:'var(--bg-card)', borderRadius:14, padding:24, width:'100%', maxWidth:640, maxHeight:'90vh', overflowY:'auto', boxShadow:'0 20px 60px rgba(0,0,0,.3)', border:'1px solid var(--line)' }}>
        <div style={{ fontSize:16, fontWeight:700, marginBottom:4, color:'var(--text)' }}>Gerar relatório</div>
        <div style={{ fontSize:12, color:'var(--muted)', marginBottom:18, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{s.ev.summary}</div>

        {semVinculo && (
          <div style={{ padding:'10px 12px', borderRadius:8, background:'rgba(245,158,11,.1)', border:'1px solid rgba(245,158,11,.3)', color:'#F59E0B', fontSize:12.5, marginBottom:16 }}>
            Vincule uma pessoa a este evento antes de gerar o relatório.
          </div>
        )}

        <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>Tipo de reunião</label>
        <select value={s.tipo} onChange={e => onChange({ tipo: e.target.value as TipoReuniao })}
          style={{ width:'100%', marginTop:6, marginBottom:14, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-soft)', color:'var(--text)', fontSize:13, boxSizing:'border-box' }}>
          {TIPOS_REUNIAO.map(t => <option key={t} value={t}>{TIPO_REUNIAO_LABEL[t]}</option>)}
        </select>

        <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>Transcrição da reunião</label>
        <textarea value={s.transcricao} onChange={e => onChange({ transcricao: e.target.value })} rows={8} placeholder="Cole aqui a transcrição gerada pelo Notion AI Meeting Notes..."
          style={{ width:'100%', marginTop:6, marginBottom:14, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-soft)', color:'var(--text)', fontSize:13, resize:'vertical', boxSizing:'border-box', fontFamily:'inherit' }} />

        {s.relatorio && (
          <div style={{ marginBottom:14 }}>
            <label style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px' }}>Relatório gerado</label>
            <textarea value={s.relatorio} onChange={e => onChange({ relatorio: e.target.value })} rows={14}
              style={{ width:'100%', marginTop:6, padding:'9px 12px', borderRadius:8, border:'1px solid var(--line)', background:'var(--bg-soft)', color:'var(--text)', fontSize:12.5, resize:'vertical', boxSizing:'border-box', fontFamily:'monospace', lineHeight:1.5 }} />
          </div>
        )}

        <div style={{ display:'flex', gap:8, justifyContent:'flex-end' }}>
          <button onClick={onClose} style={{ padding:'8px 14px', borderRadius:8, border:'1px solid var(--line)', background:'transparent', color:'var(--text)', cursor:'pointer', fontSize:13 }}>Fechar</button>
          <button onClick={onGerar} disabled={s.gerando || semVinculo} style={{ padding:'8px 18px', borderRadius:8, border:'none', background:'var(--primary)', color:'#fff', cursor:(s.gerando||semVinculo)?'not-allowed':'pointer', fontSize:13, fontWeight:700, opacity:(s.gerando||semVinculo)?.6:1 }}>
            {s.gerando ? 'Gerando...' : (s.relatorio ? 'Regerar' : 'Gerar relatório')}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── EventCard ────────────────────────────────────────────────────────────────

function EventCard({ ev, showConsultor, onLink, onRelatorio }: { ev: CalendarEventDB & { _consultor?: string }; showConsultor: boolean; onLink: () => void; onRelatorio: () => void }) {
  const guests = (ev.attendees || []).filter((a: {self?: boolean; email?: string}) => !a.self && a.email);
  const hasLead = !!ev.lead_id;
  return (
    <div style={{ padding:'10px 13px', borderRadius:10, background:'var(--bg-card)', border:`1px solid ${hasLead ? 'rgba(99,102,241,.3)' : 'var(--line)'}`, display:'flex', flexDirection:'column', gap:5 }}>
      <div style={{ display:'flex', gap:10 }}>
        <div style={{ minWidth:68, fontSize:11, color:'var(--muted)', lineHeight:1.8, fontVariantNumeric:'tabular-nums' }}>
          {ev.is_all_day ? 'Dia todo' : `${fmtTime(ev.start_at)}–${fmtTime(ev.end_at)}`}
        </div>
        <div style={{ flex:1, minWidth:0 }}>
          <div style={{ fontSize:13, fontWeight:600, whiteSpace:'nowrap', overflow:'hidden', textOverflow:'ellipsis' }}>{ev.summary}</div>
          {showConsultor && ev._consultor && <div style={{ fontSize:11, color:'#818cf8', marginTop:2 }}>👤 {ev._consultor}</div>}
          {ev.location && <div style={{ fontSize:11, color:'var(--muted)', marginTop:2 }}>📍 {ev.location}</div>}
          {ev.hangout_link && <a href={ev.hangout_link} target="_blank" rel="noopener noreferrer" style={{ fontSize:11, color:'var(--primary)', fontWeight:600, display:'block', marginTop:2 }}>🎥 Google Meet</a>}
          {guests.length > 0 && (
            <div style={{ display:'flex', gap:4, flexWrap:'wrap', marginTop:3 }}>
              {guests.slice(0,4).map((g: {email: string; displayName?: string; responseStatus?: string}) => (
                <span key={g.email} style={{ fontSize:10, padding:'1px 6px', borderRadius:12, background:'var(--bg-soft)', border:'1px solid var(--line)', color:'var(--muted)' }}>
                  {g.displayName || g.email.split('@')[0]}
                </span>
              ))}
              {guests.length > 4 && <span style={{ fontSize:10, color:'var(--muted)' }}>+{guests.length-4}</span>}
            </div>
          )}
          {hasLead ? (
            <div style={{ marginTop:6, padding:'5px 9px', borderRadius:7, background:'rgba(99,102,241,.07)', border:'1px solid rgba(99,102,241,.2)', display:'flex', gap:7, alignItems:'flex-start' }}>
              <span style={{ fontSize:12 }}>👤</span>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:12, fontWeight:700 }}>{ev.lead_nome}</div>
                {ev.lead_notas && <div style={{ fontSize:11, color:'var(--muted)', marginTop:1 }}>{ev.lead_notas}</div>}
              </div>
              <button onClick={onLink} style={{ fontSize:10, padding:'2px 7px', borderRadius:5, border:'1px solid rgba(99,102,241,.3)', background:'transparent', color:'#818cf8', cursor:'pointer', flexShrink:0 }}>Editar</button>
            </div>
          ) : (
            <button onClick={onLink} style={{ marginTop:5, padding:'3px 9px', borderRadius:6, border:'1px dashed var(--line)', background:'transparent', color:'var(--muted)', cursor:'pointer', fontSize:11 }}>+ Vincular pessoa</button>
          )}
          {/* Botões de ação */}
          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:6 }}>
            <button onClick={onRelatorio} title={ev.relatorio_gerado ? 'Ver/editar relatório' : 'Gerar relatório'}
              style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${ev.relatorio_gerado ? 'rgba(34,197,94,.4)' : 'var(--line)'}`, background:ev.relatorio_gerado ? 'rgba(34,197,94,.08)' : 'var(--bg-soft)', color:ev.relatorio_gerado ? '#22c55e' : 'var(--text)', fontSize:10, fontWeight:600, cursor:'pointer' }}>
              📄 {ev.relatorio_gerado ? 'Relatório ✓' : 'Relatório'}
            </button>
            {[['📋','Briefing',ev.briefing_gerado],['✉️','Follow-up',ev.followup_gerado]].map(([icon, label, done]) => (
              <button key={String(label)} disabled title={`${label} (em breve)`}
                style={{ padding:'3px 8px', borderRadius:5, border:`1px solid ${done ? 'rgba(34,197,94,.4)' : 'var(--line)'}`, background:done ? 'rgba(34,197,94,.08)' : 'var(--bg-soft)', color:done ? '#22c55e' : 'var(--muted)', fontSize:10, fontWeight:600, cursor:'not-allowed', opacity:done ? 1 : .5 }}>
                {String(icon)} {String(label)}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Visão em grade semanal (Sábado → Sexta) ──────────────────────────────────

const DIAS_SEM_SAB = ['Sáb', 'Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex'];

function ymdLocal(d: Date) {
  return d.toLocaleDateString('en-CA'); // YYYY-MM-DD
}

// Início da semana = sábado anterior (ou o próprio, se for sábado)
function inicioSemanaSabado(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  const off = (x.getDay() + 1) % 7; // Sáb→0, Dom→1, ... Sex→6
  x.setDate(x.getDate() - off);
  return x;
}

type EvDB = CalendarEventDB & { _consultor?: string };

const HORA_ALT = 46; // altura de 1 hora em px

function horaDecimal(iso: string) {
  const d = new Date(iso);
  return d.getHours() + d.getMinutes() / 60;
}

// Distribui eventos sobrepostos em colunas (lanes), estilo Google Agenda
function organizarLanes(evs: EvDB[]): { ev: EvDB; lane: number; lanes: number }[] {
  const ordenados = [...evs].sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime());
  const fimLane: number[] = [];
  const provisorio: { ev: EvDB; lane: number }[] = [];
  for (const ev of ordenados) {
    const ini = new Date(ev.start_at).getTime();
    const fim = new Date(ev.end_at).getTime();
    let lane = fimLane.findIndex(f => f <= ini);
    if (lane === -1) { lane = fimLane.length; fimLane.push(fim); }
    else fimLane[lane] = fim;
    provisorio.push({ ev, lane });
  }
  const totalLanes = Math.max(1, fimLane.length);
  return provisorio.map(p => ({ ...p, lanes: totalLanes }));
}

function WeekGrid({
  events,
  onLink,
  onRelatorio,
}: {
  events: EvDB[];
  onLink: (ev: EvDB) => void;
  onRelatorio: (ev: EvDB) => void;
}) {
  const [anchor, setAnchor] = useState<Date>(() => inicioSemanaSabado(new Date()));
  const [sel, setSel] = useState<EvDB | null>(null);

  const dias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });

  // Separa eventos com horário (timed) e de dia inteiro (all-day), por dia
  const timedByDay = new Map<string, EvDB[]>();
  const allDayByDay = new Map<string, EvDB[]>();
  let minH = 8, maxH = 19; // faixa base de horas, expande conforme eventos
  for (const ev of events) {
    if (ev.is_all_day || ev.start_at.length <= 10) {
      const day = ev.start_at.slice(0, 10);
      if (!allDayByDay.has(day)) allDayByDay.set(day, []);
      allDayByDay.get(day)!.push(ev);
    } else {
      const day = ymdLocal(new Date(ev.start_at));
      if (!timedByDay.has(day)) timedByDay.set(day, []);
      timedByDay.get(day)!.push(ev);
      minH = Math.min(minH, Math.floor(horaDecimal(ev.start_at)));
      maxH = Math.max(maxH, Math.ceil(horaDecimal(ev.end_at)));
    }
  }
  minH = Math.max(0, minH);
  maxH = Math.min(24, Math.max(maxH, minH + 1));
  const horas: number[] = [];
  for (let h = minH; h <= maxH; h++) horas.push(h);
  const gridAltura = (maxH - minH) * HORA_ALT;

  const hojeYmd = ymdLocal(new Date());
  const temAllDay = dias.some(d => (allDayByDay.get(ymdLocal(d)) || []).length > 0);
  const fim = dias[6];
  const mesmoMes = anchor.getMonth() === fim.getMonth();
  const rangeLabel = mesmoMes
    ? `${anchor.getDate()} – ${fim.getDate()} ${MESES[fim.getMonth()]} ${fim.getFullYear()}`
    : `${anchor.getDate()} ${MESES[anchor.getMonth()]} – ${fim.getDate()} ${MESES[fim.getMonth()]} ${fim.getFullYear()}`;

  const navegar = (semanas: number) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + semanas * 7);
    setAnchor(d);
  };

  return (
    <div>
      {/* Navegação */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, gap: 8, flexWrap: 'wrap' }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>{rangeLabel}</div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button onClick={() => navegar(-1)} style={navBtn} title="Semana anterior">‹</button>
          <button onClick={() => setAnchor(inicioSemanaSabado(new Date()))} style={{ ...navBtn, width: 'auto', padding: '0 12px' }}>Hoje</button>
          <button onClick={() => navegar(1)} style={navBtn} title="Próxima semana">›</button>
        </div>
      </div>

      {/* Calendário semanal estilo Google */}
      <div style={{ overflowX: 'auto', border: '1px solid var(--line)', borderRadius: 12, background: 'var(--bg-card)' }}>
        <div style={{ minWidth: 720 }}>
          {/* Cabeçalho dos dias */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--line)' }}>
            <div />
            {dias.map((d, i) => {
              const isHoje = ymdLocal(d) === hojeYmd;
              return (
                <div key={ymdLocal(d)} style={{
                  padding: '8px 4px', textAlign: 'center', borderLeft: '1px solid var(--line)',
                  background: isHoje ? 'var(--primary-100)' : 'transparent',
                }}>
                  <div style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.5px', color: isHoje ? 'var(--primary-bright)' : 'var(--muted)' }}>
                    {DIAS_SEM_SAB[i]}
                  </div>
                  <div style={{ fontSize: 17, fontWeight: 800, marginTop: 1, color: isHoje ? 'var(--primary-bright)' : 'var(--text)' }}>
                    {d.getDate()}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Faixa de eventos de dia inteiro */}
          {temAllDay && (
            <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)', borderBottom: '1px solid var(--line)', background: 'var(--bg-soft)' }}>
              <div style={{ fontSize: 9, color: 'var(--muted)', display: 'flex', alignItems: 'center', justifyContent: 'flex-end', padding: '0 6px', textAlign: 'right' }}>dia todo</div>
              {dias.map(d => {
                const evs = allDayByDay.get(ymdLocal(d)) || [];
                return (
                  <div key={ymdLocal(d)} style={{ borderLeft: '1px solid var(--line)', padding: 3, display: 'flex', flexDirection: 'column', gap: 3, minHeight: 24 }}>
                    {evs.map(ev => (
                      <button key={ev.id} onClick={() => setSel(ev)} title={ev.summary}
                        style={{ textAlign: 'left', padding: '3px 6px', borderRadius: 5, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 10.5, fontWeight: 600, cursor: 'pointer', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {ev.summary}
                      </button>
                    ))}
                  </div>
                );
              })}
            </div>
          )}

          {/* Grade de horas */}
          <div style={{ display: 'grid', gridTemplateColumns: '52px repeat(7, 1fr)' }}>
            {/* Eixo de horários */}
            <div style={{ position: 'relative', height: gridAltura }}>
              {horas.map(h => (
                <div key={h} style={{ position: 'absolute', top: (h - minH) * HORA_ALT, right: 6, transform: 'translateY(-7px)', fontSize: 10.5, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                  {String(h).padStart(2, '0')}:00
                </div>
              ))}
            </div>

            {/* Colunas dos dias */}
            {dias.map(d => {
              const ymd = ymdLocal(d);
              const isHoje = ymd === hojeYmd;
              const evs = timedByDay.get(ymd) || [];
              const posicionados = organizarLanes(evs);
              return (
                <div key={ymd} style={{
                  position: 'relative', height: gridAltura, borderLeft: '1px solid var(--line)',
                  background: isHoje ? 'rgba(61,130,189,.04)' : 'transparent',
                }}>
                  {/* Linhas de hora */}
                  {horas.map(h => (
                    <div key={h} style={{ position: 'absolute', top: (h - minH) * HORA_ALT, left: 0, right: 0, height: HORA_ALT, borderTop: '1px solid var(--line)' }} />
                  ))}

                  {/* Eventos posicionados */}
                  {posicionados.map(({ ev, lane, lanes }) => {
                    const ini = horaDecimal(ev.start_at);
                    const fimEv = Math.max(horaDecimal(ev.end_at), ini + 0.25);
                    const top = (ini - minH) * HORA_ALT;
                    const altura = Math.max((fimEv - ini) * HORA_ALT - 2, 18);
                    const largura = 100 / lanes;
                    const hasLead = !!ev.lead_id;
                    return (
                      <button
                        key={ev.id}
                        onClick={() => setSel(ev)}
                        title={`${ev.summary} · ${fmtTime(ev.start_at)}–${fmtTime(ev.end_at)}`}
                        style={{
                          position: 'absolute', top, height: altura,
                          left: `calc(${lane * largura}% + 2px)`, width: `calc(${largura}% - 4px)`,
                          textAlign: 'left', padding: '3px 5px', borderRadius: 5, overflow: 'hidden',
                          border: 'none', borderLeft: `3px solid ${hasLead ? '#4f46e5' : 'var(--primary-bright)'}`,
                          background: hasLead ? 'rgba(99,102,241,.14)' : 'var(--primary-100)',
                          color: 'var(--text)', cursor: 'pointer', lineHeight: 1.2,
                        }}
                      >
                        <div style={{ fontSize: 9.5, fontWeight: 700, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>
                          {fmtTime(ev.start_at)}
                        </div>
                        <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {ev.summary}
                        </div>
                        {hasLead && altura > 40 && (
                          <div style={{ fontSize: 9.5, color: '#6366f1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            👤 {ev.lead_nome}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Popover de detalhe do evento */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16 }}>
          <div onClick={e => e.stopPropagation()} style={{ background: 'var(--bg-card)', borderRadius: 14, padding: 20, width: '100%', maxWidth: 400, boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)' }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{sel.summary}</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginBottom: 14 }}>
              {fmtDay(sel.start_at)} · {sel.is_all_day ? 'Dia todo' : `${fmtTime(sel.start_at)}–${fmtTime(sel.end_at)}`}
            </div>
            {sel.location && <div style={{ fontSize: 12.5, color: 'var(--text-dim)', marginBottom: 6 }}>📍 {sel.location}</div>}
            {sel.hangout_link && <a href={sel.hangout_link} target="_blank" rel="noopener noreferrer" style={{ fontSize: 12.5, color: 'var(--primary)', fontWeight: 600, display: 'block', marginBottom: 6 }}>🎥 Google Meet</a>}
            {sel.lead_id && (
              <div style={{ fontSize: 12.5, color: 'var(--text)', marginBottom: 6 }}>👤 <strong>{sel.lead_nome}</strong></div>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
              <button onClick={() => { onLink(sel); setSel(null); }} style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', cursor: 'pointer', fontSize: 13, fontWeight: 600 }}>
                {sel.lead_id ? 'Editar vínculo' : '+ Vincular pessoa'}
              </button>
              <button onClick={() => { onRelatorio(sel); setSel(null); }} style={{ padding: '8px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', cursor: 'pointer', fontSize: 13, fontWeight: 700 }}>
                📄 Relatório
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const navBtn: React.CSSProperties = { width: 34, height: 32, borderRadius: 8, border: '1px solid var(--line)', background: 'var(--bg-card)', color: 'var(--text)', cursor: 'pointer', fontSize: 16, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center' };

// ─── Painel de um consultor ───────────────────────────────────────────────────

function ConsultorPanel({ userId, consultor, onToast }: { userId: string; consultor: string; onToast: (m: string, e?: boolean) => void }) {
  const [events, setEvents] = useState<(CalendarEventDB & { _consultor?: string })[]>([]);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [lastSync, setLastSync] = useState<string|null>(null);
  const [modal, setModal] = useState<LinkState|null>(null);
  const [relModal, setRelModal] = useState<RelatorioState|null>(null);
  const [vista, setVista] = useState<'semana' | 'lista'>('semana');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/calendar/events?userId=${userId}`);
      const j = await r.json();
      if (j.ok) {
        setEvents(j.events || []);
        const latest = (j.events || []).sort((a: CalendarEventDB, b: CalendarEventDB) => b.synced_at.localeCompare(a.synced_at))[0];
        if (latest) setLastSync(latest.synced_at);
      }
    } finally { setLoading(false); }
  }, [userId]);

  const loadPessoas = useCallback(async () => {
    const { data } = await supabase
      .from('pessoas')
      .select('*')
      .order('nome', { ascending: true });
    setPessoas((data as Pessoa[]) || []);
  }, []);

  useEffect(() => { load(); loadPessoas(); }, [load, loadPessoas]);

  const sync = async () => {
    setSyncing(true);
    try {
      const r = await fetch('/api/calendar/sync', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ userId }) });
      const j = await r.json();
      if (j.ok) { onToast(`✓ ${j.upserted} eventos sincronizados`); await load(); }
      else onToast(j.message || j.error || 'Erro', true);
    } catch { onToast('Falha na conexão', true); }
    finally { setSyncing(false); }
  };

  const saveLink = async () => {
    if (!modal) return;
    setModal(p => p ? { ...p, saving:true } : null);
    const pessoa = pessoas.find(p => p.id === modal.lead_id);
    const lead_nome = pessoa ? pessoa.nome : null;
    const lead_id = modal.lead_id || null;
    try {
      const r = await fetch('/api/calendar/events', { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ eventId: modal.ev.id, userId: modal.userId, lead_id, lead_nome, lead_notas: modal.lead_notas||null }) });
      const j = await r.json();
      if (j.ok) {
        onToast('✓ Vínculo salvo');
        setEvents(prev => prev.map(e => e.id === modal.ev.id ? { ...e, lead_id, lead_nome, lead_notas: modal.lead_notas||null } : e));
        setModal(null);
      } else { onToast(j.error||'Erro', true); setModal(p => p ? { ...p, saving:false } : null); }
    } catch { onToast('Falha', true); setModal(p => p ? { ...p, saving:false } : null); }
  };

  const gerarRelatorio = async () => {
    if (!relModal) return;
    if (relModal.transcricao.trim().length < 50) { onToast('Cole a transcrição completa', true); return; }
    setRelModal(p => p ? { ...p, gerando:true } : null);
    try {
      const r = await fetch('/api/relatorio', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ eventId: relModal.ev.id, tipo: relModal.tipo, transcricao: relModal.transcricao }) });
      const j = await r.json();
      if (j.ok) {
        onToast('✓ Relatório gerado');
        setRelModal(p => p ? { ...p, relatorio: j.relatorio, gerando:false } : null);
        setEvents(prev => prev.map(e => e.id === relModal.ev.id ? { ...e, relatorio_gerado: true } : e));
      } else {
        onToast(j.message || j.error || 'Erro ao gerar', true);
        setRelModal(p => p ? { ...p, gerando:false } : null);
      }
    } catch { onToast('Falha na conexão', true); setRelModal(p => p ? { ...p, gerando:false } : null); }
  };

  const byDay = groupByDay(events);
  const days = Array.from(byDay.keys()).sort();

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
      {/* Header */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:8 }}>
        <div style={{ fontSize:12, color:'var(--muted)' }}>
          {events.length} evento{events.length!==1?'s':''} · próximos 30 dias
          {lastSync && <> · sync {new Date(lastSync).toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}</>}
        </div>
        <div style={{ display:'flex', gap:8, alignItems:'center' }}>
          {/* Toggle Semana / Lista */}
          <div style={{ display:'flex', borderRadius:8, border:'1px solid var(--line)', overflow:'hidden' }}>
            {([['semana','📅 Semana'],['lista','☰ Lista']] as const).map(([v, label]) => (
              <button key={v} onClick={() => setVista(v)}
                style={{ padding:'6px 11px', border:'none', fontSize:12, fontWeight:600, cursor:'pointer',
                  background: vista===v ? 'var(--primary)' : 'transparent',
                  color: vista===v ? '#fff' : 'var(--muted)' }}>
                {label}
              </button>
            ))}
          </div>
          <button onClick={sync} disabled={syncing} style={{ padding:'7px 14px', borderRadius:8, border:'1px solid var(--line)', background:syncing?'var(--bg-soft)':'var(--primary)', color:syncing?'var(--muted)':'#fff', cursor:syncing?'not-allowed':'pointer', fontSize:12, fontWeight:700, display:'flex', gap:6, alignItems:'center' }}>
            <span style={{ display:'inline-block', animation:syncing?'spin 1s linear infinite':'none' }}>🔄</span>
            {syncing ? 'Sincronizando...' : 'Sincronizar Google'}
          </button>
        </div>
      </div>

      {loading && <div style={{ padding:24, textAlign:'center', color:'var(--muted)', fontSize:13 }}>Carregando...</div>}

      {!loading && events.length === 0 && (
        <div style={{ padding:28, textAlign:'center', borderRadius:10, border:'1px dashed var(--line)', background:'var(--bg-soft)' }}>
          <div style={{ fontSize:24, marginBottom:8 }}>📭</div>
          <div style={{ fontSize:13, fontWeight:600, marginBottom:4 }}>Nenhum evento sincronizado</div>
          <div style={{ fontSize:12, color:'var(--muted)' }}>Clique em <strong>Sincronizar Google</strong> para importar os próximos 30 dias.</div>
        </div>
      )}

      {/* Visão em grade semanal (Sábado → Sexta) */}
      {!loading && events.length > 0 && vista === 'semana' && (
        <WeekGrid
          events={events}
          onLink={ev => setModal({ ev, userId, lead_id: ev.lead_id||'', lead_notas: ev.lead_notas||'', saving:false })}
          onRelatorio={ev => setRelModal({ ev, tipo: (ev.tipo_reuniao as TipoReuniao) || 'analise', transcricao: ev.transcricao || '', relatorio: ev.relatorio || '', gerando:false })}
        />
      )}

      {/* Visão em lista */}
      {!loading && vista === 'lista' && days.map(d => (
        <div key={d}>
          <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.5px', marginBottom:6, paddingBottom:5, borderBottom:'1px solid var(--line)' }}>
            {fmtDay(d)}
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {byDay.get(d)!.map(ev => (
              <EventCard key={ev.id} ev={ev} showConsultor={false}
                onLink={() => setModal({ ev, userId, lead_id: ev.lead_id||'', lead_notas: ev.lead_notas||'', saving:false })}
                onRelatorio={() => setRelModal({ ev, tipo: (ev.tipo_reuniao as TipoReuniao) || 'analise', transcricao: ev.transcricao || '', relatorio: ev.relatorio || '', gerando:false })} />
            ))}
          </div>
        </div>
      ))}

      {modal && <LinkModal s={modal} pessoas={pessoas} onChange={p => setModal(prev => prev ? {...prev,...p} : null)} onSave={saveLink} onClose={() => setModal(null)} />}
      {relModal && <RelatorioModal s={relModal} onChange={p => setRelModal(prev => prev ? {...prev,...p} : null)} onGerar={gerarRelatorio} onClose={() => setRelModal(null)} />}
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────

interface Props {
  filtroConsultor: string;
}

interface ConsultorInfo { id: string; email: string; consultor_nome: string; }

export default function Agenda({ filtroConsultor }: Props) {
  const [consultores, setConsultores] = useState<ConsultorInfo[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [selectedNome, setSelectedNome] = useState<string>('');
  const [toast, setToast] = useState<{msg:string;error?:boolean}|null>(null);

  const showToast = (msg: string, error = false) => {
    setToast({ msg, error });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    // Busca lista de consultores com token
    fetch('/api/calendar/consultores')
      .then(r => r.json())
      .then(j => {
        if (j.ok && j.consultores?.length) {
          setConsultores(j.consultores);
          // Se há filtro de consultor, seleciona ele
          if (filtroConsultor) {
            const found = j.consultores.find((c: ConsultorInfo) => c.consultor_nome === filtroConsultor);
            if (found) { setSelectedId(found.id); setSelectedNome(found.consultor_nome); }
          } else {
            setSelectedId(j.consultores[0].id);
            setSelectedNome(j.consultores[0].consultor_nome || j.consultores[0].email);
          }
        }
      })
      .catch(() => {});
  }, [filtroConsultor]);

  return (
    <div className="fade-in" style={{ display:'flex', flexDirection:'column', gap:16 }}>
      {/* Seletor de consultor */}
      {!filtroConsultor && consultores.length > 1 && (
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          {consultores.map(c => (
            <button key={c.id} onClick={() => { setSelectedId(c.id); setSelectedNome(c.consultor_nome || c.email); }}
              style={{ padding:'5px 12px', borderRadius:8, border:'1px solid var(--line)', background: selectedId===c.id ? 'var(--primary)' : 'var(--bg-soft)', color: selectedId===c.id ? '#fff' : 'var(--muted)', cursor:'pointer', fontSize:12, fontWeight:600, transition:'all .15s' }}>
              {c.consultor_nome || c.email}
            </button>
          ))}
        </div>
      )}

      {consultores.length === 0 && (
        <div style={{ padding:32, textAlign:'center', borderRadius:12, border:'1px dashed var(--line)', background:'var(--bg-soft)', color:'var(--muted)', fontSize:13 }}>
          Nenhum consultor conectou o Google Calendar ainda.
        </div>
      )}

      {selectedId && (
        <ConsultorPanel key={selectedId} userId={selectedId} consultor={selectedNome} onToast={showToast} />
      )}

      {toast && (
        <div style={{ position:'fixed', bottom:24, left:'50%', transform:'translateX(-50%)', background:toast.error?'#ef4444':'#0f172a', color:'#fff', padding:'10px 20px', borderRadius:10, fontSize:13, fontWeight:600, zIndex:99999, boxShadow:'0 8px 32px rgba(0,0,0,.3)' }}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
