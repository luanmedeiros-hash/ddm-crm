'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Command } from 'cmdk';
import { supabase } from '@/lib/supabase';

interface NavItem { key: string; label: string; emoji: string }

interface PessoaHit { id: string; nome: string; fase: string; empresa: string | null }

interface Props {
  open: boolean;
  onClose: () => void;
  navItems: NavItem[];
  onGoTab: (tab: string) => void;
  onRefresh: () => void;
  onImport: () => void;
  onNovoCliente: () => void;
  onNovoLead: () => void;
}

export default function CommandPalette({ open, onClose, navItems, onGoTab, onRefresh, onImport, onNovoCliente, onNovoLead }: Props) {
  const [busca, setBusca] = useState('');
  const [pessoas, setPessoas] = useState<PessoaHit[]>([]);
  const [loading, setLoading] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Limpa a busca ao fechar
  useEffect(() => { if (!open) { setBusca(''); setPessoas([]); } }, [open]);

  // Busca pessoas no Supabase (debounce)
  useEffect(() => {
    if (debounce.current) clearTimeout(debounce.current);
    const q = busca.trim();
    if (q.length < 2) { setPessoas([]); setLoading(false); return; }
    setLoading(true);
    debounce.current = setTimeout(async () => {
      const { data } = await supabase
        .from('pessoas')
        .select('id, nome, fase, empresa')
        .ilike('nome', `%${q}%`)
        .limit(8);
      setPessoas((data || []) as PessoaHit[]);
      setLoading(false);
    }, 250);
  }, [busca]);

  if (!open) return null;

  const run = (fn: () => void) => { onClose(); fn(); };

  return (
    <div className="cmdk-overlay" onClick={onClose}>
      <div className="cmdk-box" onClick={e => e.stopPropagation()}>
        <Command shouldFilter={false} loop>
          <div className="cmdk-input-row">
            <span className="cmdk-search-icon">🔍</span>
            <Command.Input
              autoFocus
              value={busca}
              onValueChange={setBusca}
              placeholder="Buscar pessoa, navegar ou executar ação..."
              className="cmdk-input"
            />
            <span className="kbd">esc</span>
          </div>
          <Command.List className="cmdk-list">
            <Command.Empty className="cmdk-empty">
              {loading ? 'Buscando...' : 'Nenhum resultado.'}
            </Command.Empty>

            {pessoas.length > 0 && (
              <Command.Group heading="Pessoas" className="cmdk-group">
                {pessoas.map(p => (
                  <Command.Item
                    key={p.id}
                    value={`pessoa-${p.id}-${p.nome}`}
                    onSelect={() => run(() => onGoTab(p.fase === 'cliente' ? 'clientes' : 'contatos'))}
                    className="cmdk-item"
                  >
                    <span className="cmdk-item-icon">{p.fase === 'cliente' ? '👤' : '🌱'}</span>
                    <span className="cmdk-item-label">{p.nome}</span>
                    <span className="cmdk-item-hint">{p.fase === 'cliente' ? 'Cliente' : 'Lead'}{p.empresa ? ` · ${p.empresa}` : ''}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Ações" className="cmdk-group">
              <Command.Item value="acao novo lead adicionar" onSelect={() => run(onNovoLead)} className="cmdk-item">
                <span className="cmdk-item-icon">🌱</span>
                <span className="cmdk-item-label">Novo lead</span>
              </Command.Item>
              <Command.Item value="acao novo cliente adicionar" onSelect={() => run(onNovoCliente)} className="cmdk-item">
                <span className="cmdk-item-icon">👤</span>
                <span className="cmdk-item-label">Novo cliente</span>
              </Command.Item>
              <Command.Item value="acao recarregar atualizar dados" onSelect={() => run(onRefresh)} className="cmdk-item">
                <span className="cmdk-item-icon">🔄</span>
                <span className="cmdk-item-label">Recarregar dados</span>
              </Command.Item>
              <Command.Item value="acao importar arquivo csv" onSelect={() => run(onImport)} className="cmdk-item">
                <span className="cmdk-item-icon">⬆️</span>
                <span className="cmdk-item-label">Importar arquivo</span>
              </Command.Item>
            </Command.Group>

            <Command.Group heading="Ir para" className="cmdk-group">
              {navItems.map(n => (
                <Command.Item
                  key={n.key}
                  value={`nav ${n.key} ${n.label}`}
                  onSelect={() => run(() => onGoTab(n.key))}
                  className="cmdk-item"
                >
                  <span className="cmdk-item-icon">{n.emoji}</span>
                  <span className="cmdk-item-label">{n.label}</span>
                </Command.Item>
              ))}
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
