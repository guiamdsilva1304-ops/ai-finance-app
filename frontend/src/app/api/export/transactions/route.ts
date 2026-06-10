import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ?? ''

    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    // Verifica plano premium
    const { data: perfil } = await supabase
      .from('user_profiles')
      .select('plan')
      .eq('user_id', user.id)
      .single()

    if (perfil?.plan !== 'premium') {
      return NextResponse.json(
        { error: 'Disponível apenas no plano Premium' },
        { status: 403 }
      )
    }

    // Busca todas as transações do usuário
    const { data: transactions, error } = await supabase
      .from('transactions')
      .select('date, descricao, valor, categoria, tipo')
      .eq('user_id', user.id)
      .order('date', { ascending: false })

    if (error) throw error

    // Gera CSV
    const header = 'data,descricao,valor,categoria,tipo'
    const rows = (transactions ?? []).map(t => {
      const data = t.date ?? ''
      const descricao = `"${(t.descricao ?? '').replace(/"/g, '""')}"`
      const valor = Number(t.valor ?? 0).toFixed(2)
      const categoria = `"${(t.categoria ?? '').replace(/"/g, '""')}"`
      const tipo = t.tipo ?? ''
      return `${data},${descricao},${valor},${categoria},${tipo}`
    })

    const csv = [header, ...rows].join('\n')

    const now = new Date()
    const mes = String(now.getMonth() + 1).padStart(2, '0')
    const ano = now.getFullYear()
    const filename = `imoney-transacoes-${mes}-${ano}.csv`

    return new NextResponse(csv, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })

  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[/api/export/transactions]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
