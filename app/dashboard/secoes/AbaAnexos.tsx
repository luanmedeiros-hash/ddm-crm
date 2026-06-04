'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabase';

interface Anexo {
  id: string;
  nome: string;
  path: string;
  tipo_mime: string;
  tamanho: number;
  created_at: string;
}

const ICONE_MIME: Record<string, string> = {
  'application/pdf': '📄',
  'image/jpeg': '🖼️',
  'image/png': '🖼️',
  'image/webp': '🖼️',
  'application/msword': '📝',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '📝',
  'application/vnd.ms-excel': '📊',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '📊',
};

function fmtTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fmtData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

export default function AbaAnexos({ pessoaId }: { pessoaId: string }) {
  const [anexos, setAnexos] = useState<Anexo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [erro, setErro] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const carregar = useCallback(async () => {
    setLoading(true);
    const { data } = await supabase
      .from('anexos')
      .select('id, nome, path, tipo_mime, tamanho, created_at')
      .eq('pessoa_id', pessoaId)
      .order('created_at', { ascending: false });
    setAnexos((data as Anexo[]) || []);
    setLoading(false);
  }, [pessoaId]);

  useEffect(() => { carregar(); }, [carregar]);

  const upload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    if (arquivo.size > 10 * 1024 * 1024) { setErro('Arquivo muito grande. Máximo 10 MB.'); return; }

    setUploading(true); setErro('');
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setErro('Sessão expirada.'); setUploading(false); return; }

    const ext = arquivo.name.split('.').pop() || 'bin';
    const uuid = crypto.randomUUID();
    const path = `${user.id}/${pessoaId}/${uuid}.${ext}`;

    const { error: upErr } = await supabase.storage
      .from('anexos')
      .upload(path, arquivo, { contentType: arquivo.type, upsert: false });

    if (upErr) { setErro('Erro ao fazer upload: ' + upErr.message); setUploading(false); return; }

    const { error: metaErr } = await supabase.from('anexos').insert({
      pessoa_id: pessoaId,
      user_id: user.id,
      nome: arquivo.name,
      path,
      tipo_mime: arquivo.type,
      tamanho: arquivo.size,
    });

    if (metaErr) { setErro('Arquivo enviado mas metadados falharam: ' + metaErr.message); }
    else { carregar(); }
    setUploading(false);
    if (inputRef.current) inputRef.current.value = '';
  };

  const baixar = async (anexo: Anexo) => {
    const { data, error } = await supabase.storage
      .from('anexos')
      .createSignedUrl(anexo.path, 60); // URL válida por 60 segundos
    if (error || !data?.signedUrl) { alert('Erro ao gerar link: ' + error?.message); return; }
    window.open(data.signedUrl, '_blank');
  };

  const excluir = async (anexo: Anexo) => {
    if (!confirm(`Excluir "${anexo.nome}"?`)) return;
    await supabase.storage.from('anexos').remove([anexo.path]);
    await supabase.from('anexos').delete().eq('id', anexo.id);
    carregar();
  };

  return (
    <div>
      {/* Upload */}
      <div
        onClick={() => !uploading && inputRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => {
          e.preventDefault();
          const file = e.dataTransfer.files[0];
          if (file && inputRef.current) {
            const dt = new DataTransfer();
            dt.items.add(file);
            inputRef.current.files = dt.files;
            inputRef.current.dispatchEvent(new Event('change', { bubbles: true }));
          }
        }}
        style={{
          border: '2px dashed var(--line)',
          borderRadius: 10,
          padding: '20px',
          textAlign: 'center',
          cursor: uploading ? 'wait' : 'pointer',
          marginBottom: 16,
          transition: 'border-color .15s',
        }}
      >
        <div style={{ fontSize: 24, marginBottom: 6 }}>📎</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', lineHeight: 1.5 }}>
          {uploading ? 'Enviando...' : 'Clique ou arraste um arquivo'}
        </div>
        <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 4 }}>
          PDF, Word, Excel, imagens · máx. 10 MB
        </div>
        <input
          ref={inputRef}
          type="file"
          style={{ display: 'none' }}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.webp"
          onChange={upload}
        />
      </div>

      {erro && (
        <div style={{ padding: '9px 12px', background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.2)', borderRadius: 8, color: '#ef4444', fontSize: 12.5, marginBottom: 12 }}>
          {erro}
        </div>
      )}

      {loading ? (
        <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Carregando...</div>
      ) : anexos.length === 0 ? (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>
          Nenhum arquivo anexado ainda.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {anexos.map(a => (
            <div key={a.id} style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '10px 12px', borderRadius: 8,
              background: 'var(--bg-soft)', border: '1px solid var(--line)',
            }}>
              <span style={{ fontSize: 20, flexShrink: 0 }}>
                {ICONE_MIME[a.tipo_mime] || '📎'}
              </span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {a.nome}
                </div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 1 }}>
                  {fmtTamanho(a.tamanho)} · {fmtData(a.created_at)}
                </div>
              </div>
              <button
                onClick={() => baixar(a)}
                style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--line)', background: 'transparent', color: 'var(--primary)', fontSize: 12, cursor: 'pointer', fontWeight: 600 }}
              >
                ⬇ Abrir
              </button>
              <button
                onClick={() => excluir(a)}
                style={{ width: 26, height: 26, borderRadius: 6, border: 'none', background: 'transparent', color: 'var(--muted)', cursor: 'pointer', fontSize: 13 }}
              >✕</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
