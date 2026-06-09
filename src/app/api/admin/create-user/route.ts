import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  // Verificar que existe service role key
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json({ error: 'Configuração do servidor em falta.' }, { status: 500 })
  }

  const { email, password, full_name, role } = await req.json()

  if (!email || !password || !full_name || !role) {
    return NextResponse.json({ error: 'Campos obrigatórios em falta.' }, { status: 400 })
  }

  // Cliente admin com service role (não afeta a sessão do utilizador atual)
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Criar utilizador via Admin API
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name, role },
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Atualizar o perfil com role correto (o trigger pode não aplicar role)
  if (data.user) {
    await admin
      .from('profiles')
      .update({ full_name, role })
      .eq('id', data.user.id)
  }

  return NextResponse.json({ success: true, userId: data.user?.id })
}
