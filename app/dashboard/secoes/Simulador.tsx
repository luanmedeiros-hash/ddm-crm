'use client';

import React, { useState } from 'react';
import { CONSULTORES, ETAPAS, TIPOS_BLOQUEIO, ACOES_BLOQUEIO } from '@/lib/constants';
import { fmtData, ultimosDiasUteis } from '@/lib/calculos';

const METAS_BASE: Record<string, number> = { AA: 3, CA: 2, SA: 2, EA: 1, AF: 2, CF: 2, SF: 2, EF: 1, AP: 2, PP: 1, REC: 1 };

interface Props {
  onSubmit: (msg: string, isError?: boolean) => void;
}

export default function Simulador({ onSubmit }: Props) {
  const dias = ultimosDiasUteis(1);
  const [data, setData] = useState(fmtData(dias[0]));
  const [consultor, setConsultor] = useState<string>(CONSULTORES[0]);
  const [valores, setValores] = useState<Record<string, { meta: number; real: number }>>(() => {
    const v: Record<string, { meta: number; real: number }> = {};
    ETAPAS.forEach(et => { v[et] = { meta: METAS_BASE[et], real: 0 }; });
    return v;
  });
  const [confianca, setConfianca] = useState(4);
  const [bps, setBps] = useState(['', '', '']);
  const [bloqueio, setBloqueio] = useState<string>('Sem bloqueio');
  const [ajuda, setAjuda] = useState<string>('Não');
  const [obs, setObs] = useState('');

  const handleSubmit = () => {
    onSubmit(`✓ Registro de ${consultor} simulado (não persistido — use o formulário /daily para salvar de verdade)`);
  };

  return (
    <div className="card">
      <div className="card-head">
        <h3>➕ Simulador · preview de dados (não salva)</h3>
      </div>
      <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 16 }}>
        Esta seção é só para visualizar como ficaria um registro. Para salvar de verdade, vá em <strong>/daily</strong>.
      </div>
      <div className="form-grid">
        <div className="field">
          <label>Data</label>
          <input type="date" value={data} onChange={e => setData(e.target.value)} />
        </div>
        <div className="field">
          <label>Consultor</label>
          <select value={consultor} onChange={e => setConsultor(e.target.value)}>
            {CONSULTORES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="field">
          <label>Confiança (1-5)</label>
          <select value={confianca} onChange={e => setConfianca(parseInt(e.target.value))}>{[1, 2, 3, 4, 5].map(n => <option key={n} value={n}>{n}</option>)}</select>
        </div>
        <div className="field">
          <label>Bloqueio</label>
          <select value={bloqueio} onChange={e => setBloqueio(e.target.value)}>{TIPOS_BLOQUEIO.map(t => <option key={t}>{t}</option>)}</select>
        </div>

        {ETAPAS.map(et => (
          <React.Fragment key={et}>
            <div className="field">
              <label>{et} Meta</label>
              <input type="number" min="0" value={valores[et].meta} onChange={e => setValores({ ...valores, [et]: { ...valores[et], meta: parseInt(e.target.value) || 0 } })} />
            </div>
            <div className="field">
              <label>{et} Real</label>
              <input type="number" min="0" value={valores[et].real} onChange={e => setValores({ ...valores, [et]: { ...valores[et], real: parseInt(e.target.value) || 0 } })} />
            </div>
          </React.Fragment>
        ))}

        {bps.map((bp, i) => (
          <div key={i} className="field span-4">
            <label>Big Point {i + 1}</label>
            <input type="text" value={bp} onChange={e => { const n = [...bps]; n[i] = e.target.value; setBps(n); }} placeholder="Ex: Cotar seguro do cliente João" />
          </div>
        ))}

        <div className="field span-2">
          <label>Precisa de ajuda?</label>
          <select value={ajuda} onChange={e => setAjuda(e.target.value)}><option>Não</option><option>Sim</option></select>
        </div>

        <div className="field span-4">
          <label>Observações</label>
          <textarea value={obs} onChange={e => setObs(e.target.value)} />
        </div>

        <div className="field span-4" style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
          <button className="action-btn primary" onClick={handleSubmit}>Visualizar (sem salvar)</button>
        </div>
      </div>
    </div>
  );
}
