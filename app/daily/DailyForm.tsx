'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'
import { ETAPAS, SIGNIFICADOS, METAS_BASE, TIPOS_BLOQUEIO, calcIndice } from '../../lib/constants'

export default function DailyForm({ userId, consultor, registroExistente, hoje }: {
  userId: string; consultor: string; registroExistente: any; hoje: string
}) {
  const router = useRouter()
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const initVals = () => {
    const v: Record<string, { meta: number; real: number }> = {}
    ETAPAS.forEach(et => {
      v[et] = {
        meta: registroExistente ? (registroExistente[`${et}_meta`] || METAS_BASE[et]) : METAS_BASE[et],
        real: registroExistente ? (registroExistente[`${et}_real`] || 0) : 0
      }
    })
    return v
  }

  const [vals, setVals] = useState(initVals)
  const [bp1, setBp1] = useState(registroExistente?.big_point_1 || '')
  const [bp2, setBp2] = useState(registroExistente?.big_point_2 || '')
  const [bp3, setBp3] = useState(registroExistente?.big_point_3 || '')
  const [bloqueio, setBloqueio] = useState(registroExistente?.bloqueio || 'Sem bloqueio')
  const [bloqueioDesc, setBloqueioDesc] = useState(registroExistente?.bloqueio_desc || '')
  const [ajuda, setAjuda] = useState(registroExistente?.ajuda || false)
  const [confianca, setConfianca] = useState(registroExistente?.confianca ?? 4)
  const [prioridade, setPrioridade] = useState(registroExistente?.prioridade || '')
  const [avanco, setAvanco] = useState(registroExistente?.avanco || '')
  const [obs, setObs] = useState(registroExistente?.observacoes || '')

  const regsSimulado = [{ ...Object.fromEntries(ETAPAS.flatMap(et => [[`${et}_meta`, vals[et].meta], [`${et}_real`, vals[et].real]])) }]
  const indiceAtual = calcIndice(regsSimulado)
  const clsIndice = indiceAtual >= 80 ? 'var(--ok)' : indiceAtual >= 50 ? 'var(--warn)' : 'var(--crit)'

  const handleSubmit = async () => {
    setSaving(true); setError('')
    const supabase = createClient()
    const payload = {
      data: hoje, consultor, user_id: userId,
      ...Object.fromEntries(ETAPAS.flatMap(et => [[`${et}_meta`, vals[et].meta], [`${et}_real`, vals[et].real]])),
      big_point_1: bp1, big_point_2: bp2, big_point_3: bp3,
      bloqueio, bloqueio_desc: bloqueioDesc, ajuda, confianca,
      prioridade, avanco, observacoes: obs
    }
    const { error: err } = registroExistente?.id
      ? await supabase.from('registros_daily').update(payload).eq('id', registroExistente.id)
      : await supabase.from('registros_daily').insert(payload)
    if (err) { setError('Erro ao salvar. Tente novamente.'); setSaving(false); return }
    setSaved(true); setSaving(false); router.refresh()
  }

  return (
    <div className="page-content" style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 28 }}>
        <div>
          <div className="section-title">Minha Daily · {consultor}</div>
          <div className="section-sub">
            {new Date(hoje + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
            {registroExistente && <span className="pill pill-ok" style={{ marginLeft: 10 }}>✓ Editando</span>}
          </div>
        </div>
        <div className="card card-gold" style={{ padding: '12px 20px', minWidth: 140, textAlign: 'center' }}>
          <div className="card-eyebrow">Índice atual</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 800, color: clsIndice }}>
            {indiceAtual.toFixed(0)}%
          </div>
        </div>
      </div>

      {error && <div className="login-error" style={{ marginBottom: 16 }}>{error}</div>}
      {saved && <div style={{ background: 'rgba(74,222,138,.10)', border: '1px solid rgba(74,222,138,.2)', borderRadius: 10, padding: '10px 14px', fontSize: 13, color: 'var(--ok)', marginBottom: 16 }}>✓ Daily salva!</div>}

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>📊 Funil do Dia</div>
        <div className="daily-grid">
          {ETAPAS.map(et => (
            <div key={et} className="daily-etapa-card">
              <div className="daily-etapa-name" title={SIGNIFICADOS[et]}>{et} · {SIGNIFICADOS[et]}</div>
              <div className="daily-etapa-inputs">
                <div>
                  <label>Meta</label>
                  <input type="number" min="0" className="form-input" style={{ padding: '6px 10px', fontSize: 14 }}
                    value={vals[et].meta} onChange={e => setVals({ ...vals, [et]: { ...vals[et], meta: +e.target.value || 0 } })} />
                </div>
                <div>
                  <label>Realizado</label>
                  <input type="number" min="0" className="form-input"
                    style={{ padding: '6px 10px', fontSize: 14, borderColor: vals[et].real >= vals[et].meta && vals[et].meta > 0 ? 'rgba(74,222,138,.4)' : undefined }}
                    value={vals[et].real} onChange={e => setVals({ ...vals, [et]: { ...vals[et], real: +e.target.value || 0 } })} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>⭐ Big Points <span style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 400 }}>(mínimo 3)</span></div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {[[bp1, setBp1, 'Big Point 1'], [bp2, setBp2, 'Big Point 2'], [bp3, setBp3, 'Big Point 3']].map(([val, set, label]: any) => (
            <div key={label} className="form-group">
              <label className="form-label">{label}</label>
              <input type="text" className="form-input" value={val} onChange={e => set(e.target.value)} placeholder="Ex: Fechei reunião com lead qualificado" />
            </div>
          ))}
        </div>
      </div>

      <div className="card" style={{ marginBottom: 16 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>🚧 Situação do Dia</div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
          <div className="form-group">
            <label className="form-label">Bloqueio</label>
            <select className="form-select" value={bloqueio} onChange={e => setBloqueio(e.target.value)}>
              {TIPOS_BLOQUEIO.map(t => <option key={t}>{t}</option>)}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Confiança (1-5)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 4 }}>
              <input type="range" min="1" max="5" step="1" className="form-range" value={confianca}
                onChange={e => setConfianca(+e.target.value)} style={{ flex: 1 }} />
              <span style={{ fontSize: 22, fontWeight: 700, minWidth: 32, color: confianca <= 2 ? 'var(--crit)' : confianca <= 3 ? 'var(--warn)' : 'var(--ok)' }}>{confianca}</span>
            </div>
          </div>
          {bloqueio !== 'Sem bloqueio' && (
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Descreva o bloqueio</label>
              <textarea className="form-textarea" value={bloqueioDesc} onChange={e => setBloqueioDesc(e.target.value)} placeholder="O que está travando?" />
            </div>
          )}
          <div className="form-group">
            <label className="form-label">Precisa de apoio do gestor?</label>
            <div style={{ display: 'flex', gap: 10, marginTop: 4 }}>
              <button className={`btn btn-sm ${ajuda ? 'btn-danger' : 'btn-ghost'}`} onClick={() => setAjuda(true)}>✋ Sim</button>
              <button className={`btn btn-sm ${!ajuda ? 'btn-ghost' : 'btn-ghost'}`} onClick={() => setAjuda(false)}>✓ Não</button>
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{ marginBottom: 24 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 14 }}>📝 Contexto do Dia</div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div className="form-group">
            <label className="form-label">Prioridade principal</label>
            <input type="text" className="form-input" value={prioridade} onChange={e => setPrioridade(e.target.value)} placeholder="Ex: Follow-up dos 3 clientes que pediram proposta" />
          </div>
          <div className="form-group">
            <label className="form-label">Principal avanço</label>
            <input type="text" className="form-input" value={avanco} onChange={e => setAvanco(e.target.value)} placeholder="Ex: Agendei reunião com lead qualificado" />
          </div>
          <div className="form-group">
            <label className="form-label">Observações</label>
            <textarea className="form-textarea" value={obs} onChange={e => setObs(e.target.value)} placeholder="Contexto extra, recados para o gestor..." />
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button className="btn btn-primary" style={{ padding: '12px 28px', fontSize: 14 }} onClick={handleSubmit} disabled={saving}>
          {saving ? 'Salvando…' : registroExistente ? '✓ Atualizar Daily' : '✓ Salvar Daily'}
        </button>
      </div>
    </div>
  )
}
