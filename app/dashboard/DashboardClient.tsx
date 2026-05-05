'use client'
import { useState, useMemo } from 'react'
import { CONSULTORES, ETAPAS, SIGNIFICADOS, calcIndice, classificar } from '../../lib/constants'

function StatusPill({ status }: { status: string }) {
  const cls = status === 'Crítico' ? 'crit' : status === 'Atenção' ? 'warn' : status === 'Normal' ? 'ok' : 'muted'
  return <span className={`pill pill-${cls}`}>{status}</span>
}

function Bar({ value }: { value: number }) {
  const cls = value >= 80 ? 'ok' : value >= 50 ? 'warn' : 'crit'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div className="progress-wrap" style={{ flex: 1 }}>
        <div className={`progress-bar ${cls}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
      <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-dim)', minWidth: 36 }}>
        {value.toFixed(0)}%
      </span>
    </div>
  )
}

export default function DashboardClient({ registros }: { registros: any[] }) {
  const [periodo, setPeriodo] = useState<'hoje'|'7d'|'30d'>('30d')
  const [selected, setSelected] = useState<string | null>(null)

  const range = useMemo(() => {
    const today = new Date()
    const days = periodo === 'hoje' ? 0 : periodo === '7d' ? 6 : 29
    const dates: string[] = []
    for (let i = days; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      dates.push(d.toISOString().split('T')[0])
    }
    return dates
  }, [periodo])

  const filtered = registros.filter(r => range.includes(r.data))

  const stats = useMemo(() => CONSULTORES.map(nome => {
    const regs = filtered.filter(r => r.consultor === nome)
    const ult = [...regs].sort((a, b) => b.data.localeCompare(a.data))[0] || null
    return {
      nome,
      indice: calcIndice(regs),
      status: ult ? classificar(ult) : 'Sem dados',
      pp: regs.reduce((s, r) => s + (r.PP_real || 0), 0),
      rec: regs.reduce((s, r) => s + (r.REC_real || 0), 0),
      dias: new Set(regs.map(r => r.data)).size,
      ult
    }
  }).sort((a, b) => b.indice - a.indice), [filtered])

  const top3 = stats.filter(c => c.ult).slice(0, 3)
  const indiceGeral = stats.reduce((s, c) => s + c.indice, 0) / CONSULTORES.length
  const totalPP = filtered.reduce((s, r) => s + (r.PP_real || 0), 0)
  const totalREC = filtered.reduce((s, r) => s + (r.REC_real || 0), 0)

  const alertas = useMemo(() => {
    const arr: any[] = []
    const hoje = new Date().toISOString().split('T')[0]
    const preencheramHoje = new Set(registros.filter(r => r.data === hoje).map(r => r.consultor))
    CONSULTORES.forEach(c => {
      if (!preencheramHoje.has(c)) arr.push({ lvl: 'warn', titulo: 'Sem preenchimento hoje', quem: c })
    })
    filtered.filter(r => r.ajuda).forEach(r =>
      arr.push({ lvl: 'crit', titulo: 'Pediu apoio do gestor', quem: r.consultor, desc: r.observacoes }))
    filtered.filter(r => r.confianca <= 2).forEach(r =>
      arr.push({ lvl: 'crit', titulo: `Confiança baixa (${r.confianca}/5)`, quem: r.consultor, desc: r.data }))
    filtered.filter(r => r.bloqueio !== 'Sem bloqueio').forEach(r =>
      arr.push({ lvl: 'warn', titulo: r.bloqueio, quem: r.consultor, desc: r.bloqueio_desc }))
    return arr.sort((a, b) => a.lvl === 'crit' ? -1 : 1)
  }, [filtered, registros])

  const sel = selected ? stats.find(c => c.nome === selected) : null

  return (
    <div className="page-content">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div className="section-title">Visão Geral da Equipe</div>
          <div className="section-sub">{new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</div>
        </div>
        <div style={{ display: 'flex', gap: 4 }}>
          {(['hoje', '7d', '30d'] as const).map(p => (
            <button key={p} onClick={() => setPeriodo(p)}
              style={{ padding: '5px 12px', borderRadius: 20, border: '1px solid var(--line)', background: periodo === p ? 'rgba(201,169,97,.15)' : 'none', color: periodo === p ? 'var(--gold-soft)' : 'var(--text-dim)', fontSize: 12, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
              {p === 'hoje' ? 'Hoje' : p}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Índice Geral', value: `${indiceGeral.toFixed(0)}%`, sub: 'média da equipe', color: 'var(--gold-soft)' },
          { label: 'PPs no período', value: totalPP, sub: 'pontos de produção', color: 'var(--violet-soft)' },
          { label: 'Recomendações', value: totalREC, sub: 'geradas', color: 'var(--ok)' },
          { label: 'Alertas críticos', value: alertas.filter(a => a.lvl === 'crit').length, sub: 'requerem atenção', color: 'var(--crit)' },
        ].map(kpi => (
          <div key={kpi.label} className="card card-gold">
            <div className="card-eyebrow">{kpi.label}</div>
            <div className="card-value" style={{ color: kpi.color, fontSize: 28 }}>{kpi.value}</div>
            <div className="card-sub">{kpi.sub}</div>
          </div>
        ))}
      </div>

      {top3.length > 0 && (
        <div className="top3-grid">
          {top3.map((c, i) => (
            <div key={c.nome} className="top3-card" onClick={() => setSelected(c.nome)}>
              <div className="top3-rank">#{i + 1} Atingimento</div>
              <div className="top3-name">{c.nome}</div>
              <div className="top3-value">{c.indice.toFixed(0)}%</div>
              <div style={{ marginTop: 8 }}><Bar value={c.indice} /></div>
              <div style={{ marginTop: 10, display: 'flex', gap: 8 }}>
                <StatusPill status={c.status} />
                <span style={{ fontSize: 11, color: 'var(--muted)', alignSelf: 'center' }}>PP: {c.pp} · REC: {c.rec}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 360px', gap: 16, alignItems: 'start' }}>
        <div className="card">
          <div style={{ marginBottom: 14, fontWeight: 600, color: 'var(--text)' }}>Consultores · {CONSULTORES.length}</div>
          <table className="data-table">
            <thead><tr><th>Consultor</th><th>Índice</th><th>PP</th><th>REC</th><th>Dias</th><th>Status</th></tr></thead>
            <tbody>
              {stats.map(c => (
                <tr key={c.nome} onClick={() => setSelected(c.nome === selected ? null : c.nome)}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,var(--gold),var(--gold-dim))', color: '#060c18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700, fontSize: 11, flexShrink: 0 }}>
                        {c.nome.slice(0, 2).toUpperCase()}
                      </div>
                      <span style={{ color: 'var(--text)', fontWeight: 500 }}>{c.nome}</span>
                    </div>
                  </td>
                  <td style={{ width: 140 }}><Bar value={c.indice} /></td>
                  <td><strong style={{ color: 'var(--gold-soft)' }}>{c.pp}</strong></td>
                  <td><strong style={{ color: 'var(--ok)' }}>{c.rec}</strong></td>
                  <td>{c.dias}d</td>
                  <td><StatusPill status={c.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ maxHeight: 500, overflowY: 'auto' }}>
          <div style={{ marginBottom: 14, fontWeight: 600, color: 'var(--text)' }}>⚠️ Alertas · {alertas.length}</div>
          {alertas.length === 0 ? (
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>✓ Nenhum alerta</div>
          ) : alertas.slice(0, 15).map((a, i) => (
            <div key={i} className={`alert-row ${a.lvl}`}>
              <div className="alert-title">{a.titulo}</div>
              {a.desc && <div className="alert-desc">{a.desc}</div>}
              <div className="alert-who">→ {a.quem}</div>
            </div>
          ))}
        </div>
      </div>

      {sel && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(6,12,24,.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }} onClick={() => setSelected(null)}>
          <div className="card" style={{ width: '90%', maxWidth: 560, maxHeight: '85vh', overflowY: 'auto' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700 }}>{sel.nome}</div>
                <div style={{ marginTop: 4 }}>
                  <StatusPill status={sel.status} />
                  <span style={{ marginLeft: 8, fontSize: 13, color: 'var(--text-dim)' }}>Índice: <strong>{sel.indice.toFixed(0)}%</strong></span>
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setSelected(null)}>✕ Fechar</button>
            </div>
            {sel.ult ? (
              <>
                <div className="card-eyebrow" style={{ marginBottom: 10 }}>Funil · último registro ({sel.ult.data})</div>
                <div className="funnel-grid">
                  {ETAPAS.map(et => {
                    const meta = sel.ult[`${et}_meta`] || 0
                    const real = sel.ult[`${et}_real`] || 0
                    const pct = meta > 0 ? (real / meta) * 100 : 0
                    const cls = pct >= 80 ? 'ok' : pct >= 50 ? 'warn' : meta > 0 ? 'crit' : ''
                    return (
                      <div key={et} className={`stage-cell ${cls}`} title={SIGNIFICADOS[et]}>
                        <div className="stage-name">{et}</div>
                        <div><span className="stage-real">{real}</span><span className="stage-meta">/{meta}</span></div>
                        <div className="stage-pct">{meta > 0 ? `${pct.toFixed(0)}%` : '—'}</div>
                      </div>
                    )
                  })}
                </div>
                {sel.ult.big_point_1 && (
                  <div style={{ marginTop: 16 }}>
                    <div className="card-eyebrow" style={{ marginBottom: 8 }}>Big Points</div>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {[sel.ult.big_point_1, sel.ult.big_point_2, sel.ult.big_point_3].filter(Boolean).map((bp, i) => (
                        <li key={i} style={{ fontSize: 13, color: 'var(--text-dim)' }}>⭐ {bp}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {sel.ult.bloqueio !== 'Sem bloqueio' && (
                  <div className="alert-row warn" style={{ marginTop: 16 }}>
                    <div className="alert-title">🚧 {sel.ult.bloqueio}</div>
                    {sel.ult.bloqueio_desc && <div className="alert-desc">{sel.ult.bloqueio_desc}</div>}
                  </div>
                )}
                {sel.ult.prioridade && (
                  <div style={{ marginTop: 14, padding: 14, background: 'var(--bg-3)', borderRadius: 10 }}>
                    <div className="card-eyebrow" style={{ marginBottom: 6 }}>Prioridade</div>
                    <div style={{ fontSize: 13.5, color: 'var(--text)' }}>{sel.ult.prioridade}</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--muted)', fontSize: 13 }}>Sem registros no período.</div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
