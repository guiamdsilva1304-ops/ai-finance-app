import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const resend = new Resend(process.env.RESEND_API_KEY!)

const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.imoneycronsecret2026) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { data: fila, error } = await supabase
    .from('email_queue')
    .select('*, user_profiles!inner(nome, user_id)')
    .eq('status', 'pendente')
    .not('subject', 'is', null)
    .not('body_html', 'is', null)
    .lte('scheduled_for', new Date().toISOString())
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  if (!fila || fila.length === 0) return NextResponse.json({ message: 'Nenhum email pendente.' })

  const results: any[] = []

  for (const item of fila) {
    try {
      const { data: authUser } = await supabase.auth.admin.getUserById(item.user_id)
      const emailDestino = authUser?.user?.email

      if (!emailDestino) {
        await supabase.from('email_queue').update({
          status: 'erro',
          sent_at: new Date().toISOString(),
        }).eq('id', item.id)
        results.push({ id: item.id, status: 'erro', motivo: 'email não encontrado' })
        continue
      }

      const nome = item.user_profiles?.nome || 'você'
      const bodyPersonalizado = item.body_html
        .replace(/\{\{nome\}\}/g, nome)
        .replace(/Olá!/g, `Olá, ${nome}!`)

      const { error: sendError } = await resend.emails.send({
        from: FROM,
        to: emailDestino,
        subject: item.subject,
        html: bodyPersonalizado,
      })

      if (sendError) throw new Error(sendError.message)

      await supabase.from('email_queue').update({
        status: 'enviado',
        sent_at: new Date().toISOString(),
      }).eq('id', item.id)

      results.push({ id: item.id, tipo: item.tipo, email: emailDestino, status: 'enviado' })
    } catch (err: any) {
      await supabase.from('email_queue').update({
        status: 'erro',
        sent_at: new Date().toISOString(),
      }).eq('id', item.id)

      results.push({ id: item.id, status: 'erro', motivo: err.message })
    }
  }

  const enviados = results.filter(r => r.status === 'enviado').length
  const erros = results.filter(r => r.status === 'erro').length

  return NextResponse.json({ total: fila.length, enviados, erros, results })
}
