import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  const token = auth?.replace('Bearer ', '') ?? ''
  const { data: { user } } = await supabase.auth.getUser(token)
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('plan, premium_expires_at')
    .eq('user_id', user.id)
    .maybeSingle()

  if (perfil?.plan !== 'premium' || !perfil.premium_expires_at) {
    return NextResponse.json({ emTrial: false })
  }

  const { data: assinatura } = await supabase
    .from('subscriptions')
    .select('status')
    .eq('user_id', user.id)
    .eq('status', 'active')
    .maybeSingle()

  if (assinatura) {
    return NextResponse.json({ emTrial: false })
  }

  const expiraEm = new Date(perfil.premium_expires_at).getTime()
  const diasRestantes = Math.ceil((expiraEm - Date.now()) / (1000 * 60 * 60 * 24))

  return NextResponse.json({ emTrial: true, diasRestantes: Math.max(0, diasRestantes) })
}
