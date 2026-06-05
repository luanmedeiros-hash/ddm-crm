'use client';

import React, { useMemo, useState } from 'react';
import type { Pessoa } from '@/lib/types';
import {
  TEMPLATES_MENSAGEM,
  CATEGORIAS_MENSAGEM,
  preencherTemplate,
  linkWhatsApp,
} from '@/lib/mensagens';

export default function MensagensCliente({
  cliente,
  consultorNome,
  onClose,
}: {
  cliente: Pessoa;
  consultorNome?: string;
  onClose: () => void;
}) {
  const [categoria, setCategoria] = useState<string>(CATEGORIAS_MENSAGEM[0]);
  const [selecionado, setSelecionado] = useState<string | null>(null);
  const [copiado, setCopiado] = useState(false);

  const templatesFiltrados = useMemo(
    () => TEMPLATES_MENSAGEM.filter(t => t.categoria === categoria),
    [categoria],
  );

  const template = TEMPLATES_MENSAGEM.find(t => t.id === selecionado);
  const textoFinal = template
    ? preencherTemplate(template.texto, { nome: cliente.nome.split(' ')[0], consultor: consultorNome })
    : '';

  const waLink = linkWhatsApp(cliente.telefone, textoFinal);

  const copiar = async () => {
    await navigator.clipboard.writeText(textoFinal);
    setCopiado(true);
    setTimeout(() => setCopiado(false), 1800);
  };

  return (
    <div onClick={onClose} style={overlay}>
      <div onClick={e => e.stopPropagation()} style={modalBox}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Mensagens</div>
            <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 1 }}>
              Para {cliente.nome}
            </div>
          </div>
          <button onClick={onClose} style={btnClose}>✕</button>
        </div>

        {/* Categorias */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 14 }}>
          {CATEGORIAS_MENSAGEM.map(c => (
            <button
              key={c}
              onClick={() => { setCategoria(c); setSelecionado(null); }}
              style={c === categoria ? pillActive : pill}
            >
              {c}
            </button>
          ))}
        </div>

        {/* Lista de templates */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginBottom: 14 }}>
          {templatesFiltrados.map(t => (
            <button
              key={t.id}
              onClick={() => setSelecionado(t.id === selecionado ? null : t.id)}
              style={{
                textAlign: 'left',
                padding: '10px 12px',
                borderRadius: 9,
                border: `1px solid ${t.id === selecionado ? 'var(--primary)' : 'var(--line)'}`,
                background: t.id === selecionado ? 'var(--primary-100)' : 'var(--bg-soft)',
                cursor: 'pointer',
                fontSize: 13,
                fontWeight: 600,
                color: t.id === selecionado ? 'var(--primary-bright)' : 'var(--text)',
              }}
            >
              {t.titulo}
            </button>
          ))}
        </div>

        {/* Pré-visualização */}
        {template && (
          <div>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 6 }}>
              Pré-visualização
            </div>
            <div style={{
              padding: '12px 14px', borderRadius: 10,
              background: 'var(--bg-soft)', border: '1px solid var(--line)',
              fontSize: 13, lineHeight: 1.55, color: 'var(--text)',
              whiteSpace: 'pre-wrap', maxHeight: 220, overflowY: 'auto', marginBottom: 14,
            }}>
              {textoFinal}
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={copiar} style={btnGhost}>
                {copiado ? '✓ Copiado' : 'Copiar texto'}
              </button>
              {waLink ? (
                <a href={waLink} target="_blank" rel="noopener noreferrer" style={{ ...btnPrimary, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  💬 Abrir no WhatsApp
                </a>
              ) : (
                <span style={{ fontSize: 11.5, color: 'var(--muted)', alignSelf: 'center' }}>
                  Sem telefone cadastrado
                </span>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

const overlay: React.CSSProperties = { position: 'fixed', inset: 0, background: 'rgba(15,23,42,.5)', zIndex: 10000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, backdropFilter: 'blur(2px)' };
const modalBox: React.CSSProperties = { background: 'var(--bg-card)', borderRadius: 16, padding: 22, width: '100%', maxWidth: 460, maxHeight: '88vh', overflowY: 'auto', boxShadow: 'var(--shadow-lg)', border: '1px solid var(--line)' };
const btnClose: React.CSSProperties = { width: 30, height: 30, borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13, flexShrink: 0 };
const btnPrimary: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: 'none', background: 'var(--primary)', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' };
const btnGhost: React.CSSProperties = { padding: '9px 16px', borderRadius: 8, border: '1px solid var(--line)', background: 'transparent', color: 'var(--text)', fontSize: 13, cursor: 'pointer', fontWeight: 600 };
const pill: React.CSSProperties = { padding: '5px 11px', borderRadius: 999, border: '1px solid var(--line)', background: 'transparent', color: 'var(--muted)', fontSize: 12, cursor: 'pointer', fontWeight: 600 };
const pillActive: React.CSSProperties = { ...pill, background: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' };
