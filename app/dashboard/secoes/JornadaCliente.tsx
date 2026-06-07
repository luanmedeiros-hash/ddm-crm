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

  return (
    <div style={{ marginBottom: 16 }}>
      {/* Cabeçalho: só a data de quando virou cliente */}
      <div style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--muted)', marginBottom: 10 }}>
        🗺️ Jornada
        {dataFechamento && <> · <span style={{ color: 'var(--text)' }}>cliente desde {fmtData(dataFechamento)}</span></>}
      </div>

      {/* Timeline horizontal */}
      <div style={{ display: 'flex', alignItems: 'flex-start', overflowX: 'auto', paddingBottom: 2 }}>
        {etapas.map((e, i) => (
          <React.Fragment key={e.tipo}>
            <EtapaItem etapa={e} />
            {i < etapas.length - 1 && (
              <div style={{
                height: 2, flex: 1, minWidth: 10, marginTop: 16,
                background: e.status === 'feito' ? 'var(--primary)' : 'var(--line)',
              }} />
            )}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
}

function EtapaItem({ etapa }: { etapa: EtapaCalculada }) {
  const dotClass =
    etapa.status === 'feito' ? 'done' :
    etapa.status === 'proxima' ? 'current' :
    etapa.status === 'atrasada' ? 'late' : '';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, width: 58, flexShrink: 0 }}>
      <div className={`jornada-dot ${dotClass}`}>
        {etapa.status === 'feito' ? '✓' : etapa.emoji}
      </div>
      <div style={{
        fontSize: 10, lineHeight: 1.2, textAlign: 'center',
        fontWeight: etapa.status === 'pendente' ? 500 : 600,
        color: etapa.status === 'pendente' ? 'var(--muted)' : 'var(--text)',
      }}>
        {etapa.label}
      </div>
    </div>
  );
}
