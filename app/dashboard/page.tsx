import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import DashboardClient from './DashboardClient'

export default async function DashboardPage() {
  const cookieStore = cookies()
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { get: (n) => cookieStore.get(n)?.value, set: () => {}, remove: () => {} } }
  )
  const desde = new Date()
  desde.setDate(desde.getDate() - 35)
  const { data: registros } = await supabase
    .from('registros_daily').select('*')
    .gte('data', desde.toISOString().split('T')[0])
    .order('data', { ascending: false })
  return <DashboardClient registros={registros || []} />
}
