'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa } from '@/lib/types';
import PerfilCliente from './PerfilCliente';

type ColunaKey = 'C1' | 'C2' | 'C3' | 'C4' | 'ACOMP';

function definirEtapa(c: Pessoa): ColunaKey {
  if (!c.c1) return 'C1';
  if (!c.c2) return 'C2';
  if (!c.c3) return 'C3';
  if (!c.c4) return 'C4';
  return 'ACOMP';
}

const COLUNAS: { key: ColunaKey; titulo: string; subtitulo: string }[] = [
  { key: 'C1', titulo: 'C1', subtitulo: 'Organização financeira' },
  { key: 'C2', titulo: 'C2', subtitulo: 'Seguro' },
  { key: 'C3', titulo: 'C3', subtitulo: 'Previdência' },
  { key: 'C4', titulo: 'C4', subtitulo: 'Consórcio' },
  { key: 'ACOMP', titulo: 'Acompanhamento', subtitulo: 'C1–C4 completos' },
];

function diasDesde(iso: string | null): string {
  if (!iso) return '—';
  const then = new Date(iso);
  const now = new Date();
  const days = Math.floor((now.getTime() - then.getTime()) / 86400000);
  if (days === 0) return 'hoje';
  if (days === 1) return 'ontem';
  return 'há ' + days + 'd';
}

function ateData(iso: string | null): string {
  if (!iso) return '';
  const parts = iso.split('-');
  return parts[2] + '/' + parts[1];
}

export default function Consultorias() {
  const [clientes, setClientes] = useState<Pessoa[]>([]);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState('');
  const [ultimaMap, setUltimaMap] = useState<Record<string, string>>({});
  const [proximaMap, setProximaMap] = useState<Record<string, string>>({});
  const [pendMap, setPendMap] = useState<Record<string, number>>({});
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    setErro('');

    const { data: cliData, error: cliErr } = await supabase
      .from('pessoas')
      .select('*')
      .eq('fase', 'cliente')
      .order('nome');

    if (cliErr) { setErro(cliErr.message); setLoading(false); return; }
    const clis = (cliData as Pessoa[]) || [];
    setClientes(clis);

    const ids = clis.map(c => c.id);
    if (ids.length > 0) {
      const hoje = new Date().toISOString().slice(0, 10);

      const [rRes, pRes] = await Promise.all([
        supabase.from('reunioes').select('pessoa_id, data').in('pessoa_id', ids),
        supabase.from('pendencias').select('pessoa_id').in('pessoa_id', ids).eq('status', 'aberta'),
      ]);

      const u: Record<string, string> = {};
      const p: Record<string, string> = {};
      (rRes.data || []).forEach((r: any) => {
        if (r.data < hoje) {
          if (!u[r.pessoa_id] || r.data > u[r.pessoa_id]) u[r.pessoa_id] = r.data;
        } else {
          if (!p[r.pessoa_id] || r.data < p[r.pessoa_id]) p[r.pessoa_id] = r.data;
        }
      });
      setUltimaMap(u);
      setProximaMap(p);

      const pd: Record<string, number> = {};
      (pRes.data || []).forEach((x: any) => {
        pd[x.pessoa_id] = (pd[x.pessoa_id] || 0) + 1;
      });
      setPendMap(pd);
    } else {
      setUltimaMap({}); setProximaMap({}); setPendMap({});
    }
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const porColuna = useMemo(() => {
    const m: Record<ColunaKey, Pessoa[]> = { C1: [], C2: [], C3: [], C4: [], ACOMP: [] };
    for (const c of clientes) m[definirEtapa(c)].push(c);
    return m;
  }, [clientes]);

  const S = {
    kanban: { display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 14 } as React.CSSProperties,
    coluna: { background: 'var(--bg-soft)', border: '1px solid var(--line)', borderRadius: 14, padding: 14, minHeight: 220, display: 'flex', flexDirection: 'column' } as React.CSSProperties,
    colHead: { display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 12, paddingBottom: 12, borderBottom: '1px solid var(--line)' } as React.CSSProperties,
    colTit: { fontSize: 15, fontWeight: 700, color: 'var(--text)', letterSpacing: '-.01em' } as React.CSSProperties,
    colSub: { fontSize: 11, color: 'var(--muted)', marginTop: 2 } as React.CSSProperties,
    colCount: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', minWidth: 24, height: 24, padding: '0 8px', borderRadius: 999, background: '#fff', color: 'var(--text-dim)', border: '1px solid var(--line)', fontSize: 11, fontWeight: 700 } as React.CSSProperties,
    lista: { display: 'flex', flexDirection: 'column', gap: 8, flex: 1 } as React.CSSProperties,
    vazio: { color: 'var(--muted-2)', fontSize: 12, textAlign: 'center', padding: '24px 0', fontStyle: 'italic' } as React.CSSProperties,
    card: { background: '#fff', border: '1px solid var(--line)', borderRadius: 10, padding: 12, cursor: 'pointer', transition: '.15s' } as React.CSSProperties,
    nome: { fontSize: 13, fontWeight: 600, color: 'var(--text)', letterSpacing: '-.005em' } as React.CSSProperties,
    empresa: { fontSize: 11.5, color: 'var(--muted)', marginTop: 2 } as React.CSSProperties,
    meta: { fontSize: 11, color: 'var(--muted)', marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 } as React.CSSProperties,
    badge: { display: 'inline-block', marginTop: 8, fontSize: 10.5, fontWeight: 700, background: 'rgba(220, 38, 38, .1)', color: 'var(--crit)', padding: '2px 7px', borderRadius: 4, letterSpacing: '.3px' } as React.CSSProperties,
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>Carregando…</div>;
  if (erro) return <div className="empty-state">Erro: {erro}</div>;

  return (
    <>

      <div style={S.kanban}>
        {COLUNAS.map(col => {
          const items = porColuna[col.key];
          return (
            <div key={col.key} style={S.coluna}>
              <div style={S.colHead}>
                <div>
                  <div style={S.colTit}>{col.titulo}</div>
                  <div style={S.colSub}>{col.subtitulo}</div>
                </div>
                <span style={S.colCount}>{items.length}</span>
              </div>
              <div style={S.lista}>
                {items.length === 0 ? (
                  <div style={S.vazio}>—</div>
                ) : items.map(c => {
                  const ultima = ultimaMap[c.id] ?? null;
                  const proxima = proximaMap[c.id] ?? null;
                  const pends = pendMap[c.id] ?? 0;
                  return (
                    <div key={c.id} onClick={() => setPerfilAberto(c)} style={S.card}>
                      <div style={S.nome}>{c.nome}</div>
                      {c.empresa && <div style={S.empresa}>{c.empresa}</div>}
                      <div style={S.meta}>
                        <span>Últ.: {diasDesde(ultima)}</span>
                        {proxima && <span>· Próx: {ateData(proxima)}</span>}
                      </div>
                      {pends > 0 && (
                        <div style={S.badge}>{pends} pendência{pends > 1 ? 's' : ''}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {perfilAberto && (
        <PerfilCliente cliente={perfilAberto} onClose={() => { setPerfilAberto(null); carregar(); }} />
      )}
    </>
  );
}
