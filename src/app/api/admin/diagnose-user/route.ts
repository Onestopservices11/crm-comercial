import { createClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) return NextResponse.json({ error: 'Sem service role key.' }, { status: 500 })

  const { userId } = await req.json()
  if (!userId) return NextResponse.json({ error: 'userId obrigatório.' }, { status: 400 })

  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data, error } = await admin.auth.admin.getUserById(userId)

  if (error || !data?.user) {
    return NextResponse.json({ exists: false, error: error?.message ?? 'Utilizador não encontrado no Auth.' })
  }

  const u = data.user
  return NextResponse.json({
    exists: true,
    email: u.email,
    confirmed: !!u.email_confirmed_at,
    banned: !!u.banned_until,
    banned_until: u.banned_until ?? null,
    created_at: u.created_at,
    last_sign_in: u.last_sign_in_at ?? null,
  })
}
