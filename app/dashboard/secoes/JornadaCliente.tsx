'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

// ─── Etapas da jornada ────────────────────────────────────────
interface Etapa {
  tipo: string;
  label: string;
  emoji: string;
  diasApos: number | null; // dias após etapa anterior (null = sem prazo fixo)
}

const ETAPAS: Etapa[] = [
  { tipo: 'analise',        label: 'Análise',        emoji: '🔍', diasApos: null },
  { tipo: 'c1',             label: 'C1 · Org.',      emoji: '1️⃣',  diasApos: 10  },
  { tipo: 'c2',             label: 'C2 · Seguro',    emoji: '2️⃣',  diasApos: 10  },
  { tipo: 'c3',             label: 'C3 · Prev.',     emoji: '3️⃣',  diasApos: 10  },
  { tipo: 'c4',             label: 'C4 · Consórcio', emoji: '4️⃣',  diasApos: 10  },
  { tipo: 'acompanhamento', label: 'Acomp.',         emoji: '🔄', diasApos: null },
];

interface ReuniaoMin {
  tipo: string;
  data_reuniao: string | null;
}

type StatusEtapa = 'feito' | 'proxima' | 'pendente' | 'atrasada';

interface EtapaCalculada extends Etapa {
  status: StatusEtapa;
  dataRealizada: string | null;
  dataPrevista: string | null;
  diasAtraso: number;
}

function addDias(iso: string, dias: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

function diffDias(a: string, b: string): number {
  return Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86400000);
}

function fmtData(iso: string | null) {
  if (!iso) return null;
  return new Date(iso + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function calcularJornada(reunioes: ReuniaoMin[], dataFechamento: string | null): EtapaCalculada[] {
  const hoje = new Date().toISOString().slice(0, 10);

  // Data mais recente de cada tipo
  const porTipo: Record<string, string> = {};
  for (const r of reunioes) {
    if (!r.data_reuniao) continue;
    const d = r.data_reuniao.slice(0, 10);
    if (!porTipo[r.tipo] || d > porTipo[r.tipo]) porTipo[r.tipo] = d;
  }

  const resultado: EtapaCalculada[] = [];
  let ultimaDataFeita: string | null = dataFechamento; // base para C1 é o fechamento

  for (let i = 0; i < ETAPAS.length; i++) {
    const etapa = ETAPAS[i];
    const dataRealizada = porTipo[etapa.tipo] || null;
    let dataPrevista: string | null = null;
    let status: StatusEtapa;
    let diasAtraso = 0;

    if (dataRealizada) {
      status = 'feito';
      ultimaDataFeita = dataRealizada;
    } else {
      // Calcula data prevista se houver base
      if (etapa.diasApos !== null && ultimaDataFeita) {
        dataPrevista = addDias(ultimaDataFeita, etapa.diasApos);
        const diff = diffDias(hoje, dataPrevista);
        if (diff < 0) {
          status = 'atrasada';
          diasAtraso = Math.abs(diff);
        } else {
          // É a próxima a fazer (primeira não feita com data prevista)
          const jaTemProxima = resultado.some(r => r.status === 'proxima');
          status = jaTemProxima ? 'pendente' : 'proxima';
        }
      } else {
        // Sem prazo fixo (análise sem fechamento, ou acompanhamento)
        const jaTemProxima = resultado.some(r => r.status === 'proxima' || r.status === 'atrasada');
        const anterior = i > 0 ? resultado[i - 1] : null;
        status = (!jaTemProxima && anterior?.status === 'feito') ? 'proxima' : 'pendente';
      }
    }

    resultado.push({ ...etapa, status, dataRealizada, dataPrevista, diasAtraso });
  }

  return resultado;
}

// ─── Componente ───────────────────────────────────────────────
export default function JornadaCliente({
  pessoaId,
  dataFechamento,
}: {
  pessoaId: string;
  dataFechamento: string | null;
}) {
  const [etapas, setEtapas] = useState<EtapaCalculada[]>([]);
  const [loading, setLoading] = useState(true);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('reunioes')
      .select('tipo, data_reuniao')
      .eq('pessoa_id', pessoaId);
    const calc = calcularJornada((data as ReuniaoMin[]) || [], dataFechamento);
    setEtapas(calc);
    setLoading(false);
  }, [pessoaId, dataFechamento]);

  useEffect(() => { carregar(); }, [carregar]);

  if (loading) return <div style={{ height: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--muted)', fontSize: 12 }}>Carregando jornada...</div>;

  const etapaAtual = etapas.find(e => e.status === 'proxima' || e.status === 'atrasada');

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Banner da etapa atual */}
      {etapaAtual && (
        <div style={{
          padding: '10px 14px',
          borderRadius: 10,
          marginBottom: 14,
          background: etapaAtual.status === 'atrasada' ? 'rgba(239,68,68,.08)' : 'rgba(74,144,200,.08)',
          border: `1px solid ${etapaAtual.status === 'atrasada' ? 'rgba(239,68,68,.25)' : 'rgba(74,144,200,.25)'}`,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 18 }}>{etapaAtual.emoji}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: etapaAtual.status === 'atrasada' ? '#ef4444' : 'var(--primary)' }}>
              {etapaAtual.status === 'atrasada'
                ? `${etapaAtual.label} atrasada há ${etapaAtual.diasAtraso} dia${etapaAtual.diasAtraso !== 1 ? 's' : ''}`
                : `Próxima: ${etapaAtual.label}`}
            </div>
            {etapaAtual.dataPrevista && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                {etapaAtual.status === 'atrasada' ? 'Deveria ter sido em' : 'Prevista para'}: {fmtData(etapaAtual.dataPrevista)}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Timeline horizontal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 0, overflowX: 'auto', paddingBottom: 4 }}>
        {etapas.map((e, i) => (
          <React.Fragment key={e.tipo}>
            <EtapaItem etapa={e} />
            {i < etapas.length - 1 && (
              <div style={{
                height: 2,
                flex: 1,
                minWidth: 12,
                marginTop: 16,
                background: e.status === 'feito' ? 'var(--primary)' : 'var(--line)',
                transition: 'background .3s',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function EtapaItem({ etapa }: { etapa: EtapaCalculada }) {
  const cor = {
    feito:    { bg: 'var(--primary)',            fg: '#fff',           border: 'var(--primary)'            },
    proxima:  { bg: 'rgba(74,144,200,.15)',       fg: 'var(--primary)', border: 'var(--primary)'            },
    atrasada: { bg: 'rgba(239,68,68,.12)',        fg: '#ef4444',        border: '#ef4444'                   },
    pendente: { bg: 'var(--bg-soft)',             fg: 'var(--muted)',   border: 'var(--line)'               },
  }[etapa.status];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5, minWidth: 52 }}>
      {/* Bolinha */}
      <div style={{
        width: 32, height: 32, borderRadius: 999,
        background: cor.bg, border: `2px solid ${cor.border}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: etapa.status === 'feito' ? 14 : 16,
        transition: 'all .2s',
        flexShrink: 0,
      }}>
        {etapa.status === 'feito' ? '✓' : etapa.emoji}
      </div>

      {/* Label */}
      <div style={{ fontSize: 10.5, fontWeight: 700, color: cor.fg, textAlign: 'center', whiteSpace: 'nowrap' }}>
        {etapa.label}
      </div>

      {/* Data */}
      <div style={{ fontSize: 10, color: 'var(--muted)', textAlign: 'center', minHeight: 13 }}>
        {etapa.status === 'feito' && fmtData(etapa.dataRealizada)}
        {etapa.status === 'proxima' && etapa.dataPrevista && fmtData(etapa.dataPrevista)}
        {etapa.status === 'atrasada' && <span style={{ color: '#ef4444' }}>-{etapa.diasAtraso}d</span>}
      </div>
    </div>
  );
}
