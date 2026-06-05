'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { Pessoa } from '@/lib/types';
import { buscarPendencias, type Pendencia } from '@/lib/pendencias';
import PerfilCliente from '@/app/dashboard/secoes/PerfilCliente';

function rotuloAtraso(p: Pendencia): { texto: string; cor: string } {
  if (p.atrasoDias <= 0) return { texto: 'Hoje', cor: 'var(--primary)' };
  if (p.atrasoDias === 1) return { texto: '1 dia', cor: '#d97706' };
  return { texto: `${p.atrasoDias}d`, cor: '#dc2626' };
}

export default function MinhaCarteira() {
  const [clientesAtivos, setClientesAtivos] = useState(0);
  const [leads, setLeads] = useState(0);
  const [pendencias, setPendencias] = useState<Pendencia[]>([]);
  const [loading, setLoading] = useState(true);
  const [perfilAberto, setPerfilAberto] = useState<Pessoa | null>(null);

  const carregar = useCallback(async () => {
    const [{ count: cA }, { count: lds }, pend] = await Promise.all([
      supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('fase', 'cliente').eq('status', 'ativo'),
      supabase.from('pessoas').select('id', { count: 'exact', head: true }).eq('fase', 'lead'),
      buscarPendencias(),
    ]);
    setClientesAtivos(cA || 0);
    setLeads(lds || 0);
    setPendencias(pend);
    setLoading(false);
  }, []);

  useEffect(() => { carregar(); }, [carregar]);

  const abrirPessoa = async (pessoaId: string) => {
    const { data } = await supabase.from('pessoas').select('*').eq('id', pessoaId).single();
    if (data) setPerfilAberto(data as Pessoa);
  };

  const atrasados = pendencias.filter(p => p.atrasoDias > 0).length;

  if (loading) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Contadores */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 14 }}>
        <Contador valor={clientesAtivos} label="Clientes ativos" emoji="👥" cor="var(--primary)" />
        <Contador valor={leads} label="Leads" emoji="🌱" cor="#6366f1" />
        <Contador valor={pendencias.length} label={atrasados > 0 ? `${atrasados} atrasada(s)` : 'Pendências'} emoji="🔔" cor={atrasados > 0 ? '#dc2626' : '#15a34a'} />
      </div>

      {/* Pendências */}
      <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: 16, boxShadow: 'var(--shadow-sm)' }}>
        <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 7 }}>
          📋 Minhas pendências
        </div>

        {pendencias.length === 0 ? (
          <div style={{ padding: '16px 8px', textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
            ✅ Tudo em dia! Nenhum follow-up pendente.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            {pendencias.slice(0, 8).map(p => {
              const atraso = rotuloAtraso(p);
              return (
                <button
                  key={p.id}
                  onClick={() => abrirPessoa(p.pessoaId)}
                  style={{
                    textAlign: 'left', display: 'flex', alignItems: 'center', gap: 10,
                    padding: '9px 10px', borderRadius: 9, border: '1px solid var(--line)',
                    background: 'var(--bg-soft)', cursor: 'pointer', width: '100%',
                  }}
                >
                  <span style={{ fontSize: 16 }}>{p.tipo === 'lead_followup' ? '📞' : '📌'}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{p.titulo}</div>
                    <div style={{ fontSize: 12, color: 'var(--muted)' }}>{p.pessoaNome}</div>
                  </div>
                  <span style={{ fontSize: 11, fontWeight: 700, color: atraso.cor, whiteSpace: 'nowrap' }}>{atraso.texto}</span>
                </button>
              );
            })}
            {pendencias.length > 8 && (
              <div style={{ fontSize: 11.5, color: 'var(--muted)', textAlign: 'center', paddingTop: 6 }}>
                + {pendencias.length - 8} pendência(s)
              </div>
            )}
          </div>
        )}
      </div>

      {perfilAberto && (
        <PerfilCliente
          cliente={perfilAberto}
          onClose={() => setPerfilAberto(null)}
          onSaved={carregar}
        />
      )}
    </div>
  );
}

function Contador({ valor, label, emoji, cor }: { valor: number; label: string; emoji: string; cor: string }) {
  return (
    <div style={{ background: 'var(--bg-card)', border: '1px solid var(--line)', borderRadius: 14, padding: '14px 16px', boxShadow: 'var(--shadow-sm)' }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 600, marginBottom: 4 }}>{emoji} {label}</div>
      <div style={{ fontSize: 26, fontWeight: 800, color: cor, letterSpacing: '-0.02em' }}>{valor}</div>
    </div>
  );
}
