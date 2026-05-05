'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../lib/supabase'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    const supabase = createClient()
    const { error: err } = await supabase.auth.signInWithPassword({ email, password })
    if (err) {
      setError('E-mail ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="login-page">
      <div className="login-glow" />
      <div className="login-glow-2" />
      <div className="login-card">
        <div className="login-logo">DDM</div>
        <div className="login-tagline">Daily Direct Meeting · CRM Comercial</div>
        {error && <div className="login-error">{error}</div>}
        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="form-group">
            <label className="form-label">E-mail</label>
            <input
              type="email" className="form-input"
              value={email} onChange={e => setEmail(e.target.value)}
              placeholder="seu@email.com" required
            />
          </div>
          <div className="form-group">
            <label className="form-label">Senha</label>
            <input
              type="password" className="form-input"
              value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••" required
            />
          </div>
          <button
            type="submit" className="btn btn-primary" disabled={loading}
            style={{ marginTop: 8, justifyContent: 'center', width: '100%', padding: '12px' }}
          >
            {loading ? 'Entrando…' : 'Entrar'}
          </button>
        </form>
        <div style={{ marginTop: 24, padding: 14, background: 'var(--bg-3)', borderRadius: 10, fontSize: 12, color: 'var(--muted)' }}>
          <strong style={{ color: 'var(--text-dim)', display: 'block', marginBottom: 4 }}>Primeiro acesso?</strong>
          Solicite seu e-mail e senha ao gestor da equipe.
        </div>
      </div>
    </div>
  )
}
