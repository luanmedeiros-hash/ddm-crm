import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  // Liderado é redirecionado para /daily
  if (profile?.role !== 'lider') {
    redirect('/daily');
  }

  return <>{children}</>;
}
