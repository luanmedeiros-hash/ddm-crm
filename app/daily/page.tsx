import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import DailyForm from './DailyForm'

export default async function DailyPage() {
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
  const hoje = new Date().toISOString().split('T')[0]
  const { data: reg } = await supabase
    .from('registros_daily').select('*').eq('user_id', user.id).eq('data', hoje).single()
  return (
    <DailyForm
      userId={user.id}
      consultor={profile.consultor_nome || profile.nome}
      registroExistente={reg || null}
      hoje={hoje}
    />
  )
}
