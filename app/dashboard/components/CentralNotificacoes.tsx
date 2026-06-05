'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { buscarPendencias, type Pendencia } from '@/lib/pendencias';

function rotuloAtraso(p: Pendencia): { texto: string; cor: string } {
  if (p.atrasoDias <= 0) return { texto: 'Hoje', cor: 'var(--primary)' };
  if (p.atrasoDias === 1) return { texto: '1 dia atrasado', cor: '#d97706' };
  return { texto: `${p.atrasoDias} dias atrasado`, cor: '#dc2626' };
}

export default function CentralNotificacoes({ onAbrirPessoa }: { onAbrirPessoa?: (pessoaId: string) => void }) {
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const carregar = useCallback(async () => {
    try { setPendencias(await buscarPendencias()); } catch { /* silencioso */ }
  }, []);

  useEffect(() => {
    carregar();
    const intervalo = setInterval(carregar, 5 * 60 * 1000); // recarrega a cada 5min
    return () => clearInterval(intervalo);
  }, [carregar]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const total = pendencias.length;
  const atrasados = pendencias.filter(p => p.atrasoDias > 0).length;

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setAberto(a => !a)}
        title="Pendências"
        style={{
          position: 'relative', width: 38, height: 38, borderRadius: 10,
          border: '1px solid var(--line)', background: 'var(--bg-card)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 17, boxShadow: 'var(--shadow-sm)',
        }}
      >
        🔔
        {total > 0 && (
          <span style={{
            position: 'absolute', top: -5, right: -5, minWidth: 18, height: 18,
            padding: '0 5px', borderRadius: 999,
            background: atrasados > 0 ? '#dc2626' : 'var(--primary)',
            color: '#fff', fontSize: 10.5, fontWeight: 700,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 0 0 2px var(--bg-page)',
          }}>
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {aberto && (
        <div style={{
          position: 'absolute', top: 46, right: 0, width: 340, maxHeight: 440, overflowY: 'auto',
          background: 'var(--bg-card)', borderRadius: 14, border: '1px solid var(--line)',
          boxShadow: 'var(--shadow-lg)', zIndex: 9999, padding: 8,
        }}>
          <div style={{ padding: '8px 10px 10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)' }}>Pendências</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{total}</span>
          </div>

          {total === 0 ? (
            <div style={{ padding: '24px 12px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
              ✅ Tudo em dia! Nenhuma pendência.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              {pendencias.map(p => {
                const atraso = rotuloAtraso(p);
                return (
                  <button
                    key={p.id}
                    onClick={() => { onAbrirPessoa?.(p.pessoaId); setAberto(false); }}
                    style={{
                      textAlign: 'left', display: 'flex', alignItems: 'flex-start', gap: 10,
                      padding: '9px 10px', borderRadius: 9, border: '1px solid transparent',
                      background: 'transparent', cursor: 'pointer', width: '100%',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-soft)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{ fontSize: 16, marginTop: 1 }}>{p.tipo === 'lead_followup' ? '📞' : '📌'}</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', lineHeight: 1.3 }}>{p.titulo}</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>{p.pessoaNome}</div>
                    </div>
                    <span style={{ fontSize: 10.5, fontWeight: 700, color: atraso.cor, whiteSpace: 'nowrap', marginTop: 2 }}>
                      {atraso.texto}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
