'use client'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '../lib/supabase'

const LIDER_NAV = [
  { href: '/dashboard', label: 'Visão Geral', icon: '◈' },
  { href: '/dashboard/alertas', label: 'Alertas', icon: '⚠' },
]
const LIDERADO_NAV = [
  { href: '/daily', label: 'Minha Daily', icon: '✦' },
]

export default function Sidebar({ nome, role }: { nome: string; role: string }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const items = role === 'lider' ? LIDER_NAV : LIDERADO_NAV

  const logout = async () => {
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  return (
    <aside className="sidebar">
      <div className="brand-card">
        <div className="brand-logo">DDM</div>
        <div className="brand-subtitle">Daily Direct Meeting</div>
      </div>
      <div style={{ padding: '8px 0', flex: 1 }}>
        <div className="sidebar-section">{role === 'lider' ? 'Gestão' : 'Minha área'}</div>
        {items.map(item => (
          <button
            key={item.href}
            className={`nav-item ${pathname === item.href ? 'active' : ''}`}
            onClick={() => router.push(item.href)}
          >
            <span style={{ fontSize: 16, width: 20, textAlign: 'center' }}>{item.icon}</span>
            <span>{item.label}</span>
          </button>
        ))}
      </div>
      <div style={{ padding: '12px 16px', borderTop: '1px solid var(--line)' }}>
        <div style={{ marginBottom: 10, fontSize: 12, color: 'var(--muted)' }}>
          <div style={{ fontWeight: 600, color: 'var(--text-dim)' }}>{nome}</div>
          <div style={{ fontSize: 11, marginTop: 2 }}>{role === 'lider' ? '👑 Líder' : '👤 Consultor'}</div>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={logout} style={{ width: '100%', justifyContent: 'center' }}>
          Sair
        </button>
      </div>
    </aside>
  )
}
