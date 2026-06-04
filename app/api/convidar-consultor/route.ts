// app/api/convidar-consultor/route.ts
// POST /api/convidar-consultor
// Body: { nome, email, role? }
// Apenas líderes podem chamar. Cria usuário no Supabase Auth + profile.

import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseServer } from '@/lib/supabase-server';
import { getSupabaseAdmin } from '@/lib/supabase-admin';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(request: NextRequest) {
  // Verifica se quem chama é líder
  const supabase = await getSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, error: 'unauthenticated' }, { status: 401 });

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profile?.role !== 'lider') {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
  }

  let body: { nome?: string; email?: string; role?: string };
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: 'invalid_body' }, { status: 400 });
  }

  const { nome, email, role = 'liderado' } = body;
  if (!nome?.trim() || !email?.trim()) {
    return NextResponse.json({ ok: false, error: 'nome e email são obrigatórios' }, { status: 400 });
  }
  if (!['lider', 'liderado'].includes(role)) {
    return NextResponse.json({ ok: false, error: 'role inválido' }, { status: 400 });
  }

  const emailNorm = email.trim().toLowerCase();
  const admin = getSupabaseAdmin();

  // Verifica se já existe um usuário com esse email
  const { data: existentes } = await admin.auth.admin.listUsers();
  const jaExiste = existentes?.users?.find(u => u.email === emailNorm);

  let userId: string;

  if (jaExiste) {
    userId = jaExiste.id;
    // Atualiza o profile existente
    await admin.from('profiles').upsert({
      id: userId,
      email: emailNorm,
      nome: nome.trim(),
      role,
      consultor_nome: role === 'liderado' ? nome.trim() : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    return NextResponse.json({ ok: true, status: 'updated', userId });
  }

  // Cria novo usuário via convite (envia email com magic link)
  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(emailNorm, {
    data: {
      full_name: nome.trim(),
    },
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL || 'https://ddm-crm-1um3.vercel.app'}/auth/callback`,
  });

  if (inviteErr || !invited?.user) {
    return NextResponse.json({ ok: false, error: inviteErr?.message || 'erro ao convidar' }, { status: 500 });
  }

  userId = invited.user.id;

  // Cria o profile
  const { error: profileErr } = await admin.from('profiles').upsert({
    id: userId,
    email: emailNorm,
    nome: nome.trim(),
    role,
    consultor_nome: role === 'liderado' ? nome.trim() : null,
  }, { onConflict: 'id' });

  if (profileErr) {
    return NextResponse.json({ ok: false, error: 'usuário criado mas profile falhou: ' + profileErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, status: 'invited', userId });
}
