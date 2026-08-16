'use client';

import { useState } from 'react';
import { montarContextoCliente } from '@/lib/acoes/copiar-contexto';

interface Props {
  pessoaId: string;
}

export default function BotaoCopiarContexto({ pessoaId }: Props) {
  const [estado, setEstado] = useState<'idle' | 'gerando' | 'copiado' | 'erro'>('idle');
  const [msg, setMsg] = useState<string>('');

  async function handleClick() {
    setEstado('gerando');
    setMsg('');
    try {
      const contexto = await montarContextoCliente(pessoaId);
      await navigator.clipboard.writeText(contexto);
      setEstado('copiado');
      setMsg('Colado no clipboard. Abra o Claude e cole com Cmd+V.');
      setTimeout(() => { setEstado('idle'); setMsg(''); }, 4000);
    } catch (e: any) {
      setEstado('erro');
      setMsg(e?.message ?? 'Erro ao copiar contexto');
      setTimeout(() => { setEstado('idle'); setMsg(''); }, 4000);
    }
  }

  const label =
    estado === 'gerando' ? 'Gerando...' :
    estado === 'copiado' ? '✓ Contexto copiado' :
    estado === 'erro' ? '✕ Erro' :
    '📋 Copiar contexto';

  return (
    <div style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-start', gap: 6 }}>
      <button
        onClick={handleClick}
        disabled={estado === 'gerando'}
        className="action-btn"
        title="Copia o contexto completo do cliente formatado. Cole no Claude e adicione sua pergunta."
      >
        {label}
      </button>
      {msg && (
        <div style={{
          fontSize: 11.5,
          color: estado === 'copiado' ? 'var(--ok)' : estado === 'erro' ? 'var(--crit)' : 'var(--muted)',
          fontWeight: 600,
        }}>
          {msg}
        </div>
      )}
    </div>
  );
}
