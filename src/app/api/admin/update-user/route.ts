import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Configuração em falta.' }, { status: 500 })

  const { userId, action, password, full_name, role } = await req.json()
  if (!userId || !action) return NextResponse.json({ error: 'Parâmetros em falta.' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  if (action === 'disable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: '876600h' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await admin.from('profiles').update({ active: false }).eq('id', userId)
  }

  if (action === 'enable') {
    const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: 'none' })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    await admin.from('profiles').update({ active: true }).eq('id', userId)
  }

  if (action === 'confirm_email') {
    const { error } = await admin.auth.admin.updateUserById(userId, { email_confirm: true })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (action === 'reset_password') {
    if (!password) return NextResponse.json({ error: 'Password obrigatória.' }, { status: 400 })
    const { error } = await admin.auth.admin.updateUserById(userId, { password })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  if (action === 'update_profile') {
    const { error } = await admin.from('profiles').update({ full_name, role }).eq('id', userId)
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return NextResponse.json({ success: true })
}
