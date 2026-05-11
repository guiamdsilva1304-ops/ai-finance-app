import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization')
    const token = auth?.replace('Bearer ', '') ?? ''
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

    const { data } = await supabase
      .from('user_profiles')
      .select('score_saude, diagnostico_json')
      .eq('id', user.id)
      .maybeSingle()

    const scoreImoney = data?.diagnostico_json?.score_imoney
    if (!scoreImoney) return NextResponse.json({ error: 'Score não gerado ainda' }, { status: 404 })

    return NextResponse.json({
      score: data!.score_saude ?? scoreImoney.score,
      titulo: scoreImoney.titulo,
      resumo: scoreImoney.resumo,
      pontos_fortes: scoreImoney.pontos_fortes ?? [],
      riscos: scoreImoney.riscos ?? [],
      plano_30_dias: scoreImoney.plano_30_dias ?? [],
      gerado_em: scoreImoney.gerado_em,
    })
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    console.error('[SCORE-RESULT]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
