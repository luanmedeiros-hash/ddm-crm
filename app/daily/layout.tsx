import { redirect } from 'next/navigation';
import { getSupabaseServer } from '@/lib/supabase-server';

export default async function DailyLayout({ children }: { children: React.ReactNode }) {
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return <>{children}</>;
}
