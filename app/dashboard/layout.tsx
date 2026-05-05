import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import Sidebar from '../../components/Sidebar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (!profile) redirect('/login')
  if (profile.role !== 'lider') redirect('/daily')
  return (
    <div className="app-shell">
      <Sidebar nome={profile.nome} role="lider" />
      <main className="main-area">{children}</main>
    </div>
  )
}
