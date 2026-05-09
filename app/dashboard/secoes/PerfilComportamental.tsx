'use client';

import React, { useState } from 'react';
import { PERFIS_DISC, DISC_CONFIG, PRAGMATICO_CONFIG } from '@/lib/disc';
import { CONSULTORES } from '@/lib/constants';
import Avatar from '../components/Avatar';
import Icon from '@/components/Icon';

interface Props {
  filtroConsultor: string;
  onSelect?: (nome: string) => void;
}

type Tab = 'visao-geral' | 'daily' | 'bloqueio' | 'feedback';

const TAB_LABELS: Record<Tab, { icon: string; label: string }> = {
  'visao-geral': { icon: '🧠', label: 'Perfil' },
  'daily':       { icon: '☀️', label: 'Condução Daily' },
  'bloqueio':    { icon: '🔓', label: 'Apoio Bloqueio' },
  'feedback':    { icon: '💬', label: 'Feedback' },
};

function CardConsultor({ nome, onSelect, selected }: { nome: string; onSelect: () => void; selected: boolean }) {
  const perfil = PERFIS_DISC[nome];
  if (!perfil) return null;
  const disc = DISC_CONFIG[perfil.disc];
  const prag = PRAGMATICO_CONFIG[perfil.pragmatico];

  return (
    <div
      onClick={onSelect}
      style={{
        padding: '12px 14px',
        borderRadius: 10,
        background: selected ? 'var(--bg-soft)' : 'transparent',
        border: `1px solid ${selected ? disc.cor + '40' : 'var(--line)'}`,
        cursor: 'pointer',
        transition: 'all .15s',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
      }}
    >
      <Avatar name={nome} variant="gold" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{nome}</div>
        <div style={{ display: 'flex', gap: 6, marginTop: 4, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: disc.corBg, color: disc.cor }}>
            {disc.emoji} {disc.titulo}
          </span>
          <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20, background: prag.corBg, color: prag.cor }}>
            {prag.emoji} {perfil.pragmatico}
          </span>
        </div>
      </div>
      {selected && <Icon name="chevronDown" size={12} style={{ color: disc.cor, transform: 'rotate(-90deg)' }} />}
    </div>
  );
}

function DetalheConsultor({ nome }: { nome: string }) {
  const [tab, setTab] = useState<Tab>('visao-geral');
  const perfil = PERFIS_DISC[nome];
  if (!perfil) return <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)' }}>Perfil não cadastrado</div>;

  const disc = DISC_CONFIG[perfil.disc];
  const prag = PRAGMATICO_CONFIG[perfil.pragmatico];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
      {/* Header do perfil */}
      <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--line)', background: disc.corBg }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <Avatar name={nome} variant="gold" size="lg" />
          <div>
            <div style={{ fontSize: 20, fontWeight: 700, color: 'var(--text)' }}>{nome}</div>
            <div style={{ display: 'flex', gap: 8, marginTop: 6, flexWrap: 'wrap', alignItems: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: disc.cor, color: '#fff' }}>
                {disc.emoji} DISC {perfil.disc} · {disc.titulo}
              </span>
              <span style={{ fontSize: 12, fontWeight: 700, padding: '3px 10px', borderRadius: 20, background: prag.corBg, color: prag.cor, border: `1px solid ${prag.cor}30` }}>
                {prag.emoji} {perfil.pragmatico}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 6 }}>{disc.tagline}</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 2, padding: '8px 24px', borderBottom: '1px solid var(--line)', background: 'var(--bg)' }}>
        {(Object.entries(TAB_LABELS) as [Tab, typeof TAB_LABELS[Tab]][]).map(([key, val]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            style={{
              padding: '6px 14px',
              borderRadius: 8,
              border: 'none',
              cursor: 'pointer',
              fontSize: 12,
              fontWeight: tab === key ? 700 : 500,
              background: tab === key ? disc.cor : 'transparent',
              color: tab === key ? '#fff' : 'var(--muted)',
              transition: 'all .15s',
            }}
          >
            {val.icon} {val.label}
          </button>
        ))}
      </div>

      {/* Conteúdo da tab */}
      <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
        {tab === 'visao-geral' && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-dim)', lineHeight: 1.6 }}>{perfil.descricao}</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(34,197,94,0.06)', border: '1px solid rgba(34,197,94,0.15)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#22c55e', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                  ✅ Pontos Fortes
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {perfil.fortes.map((f, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{f}</li>
                  ))}
                </ul>
              </div>
              <div style={{ padding: 14, borderRadius: 10, background: 'rgba(239,68,68,0.06)', border: '1px solid rgba(239,68,68,0.15)' }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: '#ef4444', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                  ⚠️ Pontos de Atenção
                </div>
                <ul style={{ margin: 0, padding: '0 0 0 16px', display: 'flex', flexDirection: 'column', gap: 5 }}>
                  {perfil.atencao.map((a, i) => (
                    <li key={i} style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.4 }}>{a}</li>
                  ))}
                </ul>
              </div>
            </div>

            <div style={{ padding: 14, borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 10 }}>
                🎯 Motivadores
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {perfil.motivadores.map((m, i) => (
                  <span key={i} style={{ fontSize: 12, padding: '4px 12px', borderRadius: 20, background: 'var(--bg)', border: '1px solid var(--line)', color: 'var(--text)' }}>
                    {m}
                  </span>
                ))}
              </div>
            </div>
          </>
        )}

        {tab === 'daily' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: disc.cor, textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
              ☀️ Como conduzir o daily com {nome}
            </div>
            {perfil.conduta_daily.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'var(--bg-soft)', border: '1px solid var(--line)' }}>
                <div style={{ width: 22, height: 22, borderRadius: '50%', background: disc.cor, color: '#fff', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  {i + 1}
                </div>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'bloqueio' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
              🔓 Como apoiar {nome} em momentos de bloqueio
            </div>
            {perfil.apoio_bloqueio.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(245,158,11,0.05)', border: '1px solid rgba(245,158,11,0.15)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>💡</span>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>
        )}

        {tab === 'feedback' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: '#a855f7', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
              💬 Como dar feedback para {nome}
            </div>
            {perfil.feedback.map((item, i) => (
              <div key={i} style={{ display: 'flex', gap: 12, padding: '12px 14px', borderRadius: 10, background: 'rgba(168,85,247,0.05)', border: '1px solid rgba(168,85,247,0.15)' }}>
                <span style={{ fontSize: 18, flexShrink: 0 }}>🎯</span>
                <div style={{ fontSize: 13, color: 'var(--text)', lineHeight: 1.5 }}>{item}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function PerfilComportamental({ filtroConsultor, onSelect }: Props) {
  const [selecionado, setSelecionado] = useState<string>(filtroConsultor || CONSULTORES[0]);

  const lista = filtroConsultor ? [filtroConsultor] : [...CONSULTORES];

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Aviso de privacidade */}
      <div style={{
        padding: '10px 16px',
        borderRadius: 10,
        background: 'rgba(99,102,241,0.08)',
        border: '1px solid rgba(99,102,241,0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        fontSize: 12.5,
        color: 'var(--text-dim)',
      }}>
        <span style={{ fontSize: 16 }}>🔒</span>
        <span>
          <strong style={{ color: 'var(--text)' }}>Visível apenas para líderes.</strong>{' '}
          Estas informações são confidenciais e servem para orientar a condução das conversas e o desenvolvimento individual de cada consultor.
        </span>
      </div>

      {/* Legenda DISC */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {(['D', 'I', 'S', 'C'] as const).map(d => {
          const cfg = DISC_CONFIG[d];
          return (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '5px 12px', borderRadius: 20, background: cfg.corBg, border: `1px solid ${cfg.cor}25` }}>
              <span style={{ fontSize: 13 }}>{cfg.emoji}</span>
              <span style={{ fontSize: 11.5, fontWeight: 700, color: cfg.cor }}>DISC {d}</span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>· {cfg.titulo}</span>
            </div>
          );
        })}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Lista de consultores */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'sticky', top: 0 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 4 }}>
            {filtroConsultor ? 'Consultor selecionado' : `${lista.length} consultores`}
          </div>
          {lista.map(nome => (
            <CardConsultor
              key={nome}
              nome={nome}
              selected={selecionado === nome}
              onSelect={() => setSelecionado(nome)}
            />
          ))}
        </div>

        {/* Detalhe */}
        <div style={{ borderRadius: 14, border: '1px solid var(--line)', background: 'var(--bg)', overflow: 'hidden' }}>
          {selecionado ? (
            <DetalheConsultor nome={selecionado} />
          ) : (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--muted)' }}>
              Selecione um consultor para ver o perfil
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
