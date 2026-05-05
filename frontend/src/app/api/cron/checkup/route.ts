import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)
const resend = new Resend(process.env.RESEND_API_KEY!)
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

// Envia email de resumo semanal toda segunda-feira
async function enviarResumoSemanal(email: string, nome: string) {
  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `📊 Seu resumo financeiro da semana, ${nome || 'você'}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0">📊 Resumo da semana</h1>
          <p style="color:#9FE1CB;margin:8px 0 0;font-size:14px">${new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}</p>
        </div>
        <div style="padding:28px;background:#fff">
          <p style="font-size:15px;color:#444;line-height:1.7">Oi${nome ? ` ${nome}` : ''}! Aqui está um resumo do que aconteceu com suas finanças esta semana.</p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
            <p style="font-size:14px;color:#085041;font-weight:700;margin:0 0 8px">Acesse o dashboard para ver seus números completos</p>
            <p style="font-size:13px;color:#1D9E75;margin:0">Transações, metas e investimentos atualizados em tempo real</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://imoney.ia.br/dashboard" style="background:#1D9E75;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
              Ver meu dashboard →
            </a>
          </div>
          <p style="font-size:13px;color:#888">Dica da semana: mantenha sua reserva de emergência em investimentos de liquidez diária como Tesouro Selic ou CDB liquidez diária. Com a SELIC em 14,75%, seu dinheiro rende mesmo parado.</p>
        </div>
        <div style="background:#f8f9f8;padding:16px;text-align:center;border-radius:0 0 12px 12px">
          <p style="font-size:12px;color:#aaa;margin:0">iMoney · <a href="https://imoney.ia.br" style="color:#1D9E75;">imoney.ia.br</a></p>
        </div>
      </div>`
  })
}

// Email de dica financeira semanal baseada no perfil
async function enviarDicaSemanal(email: string, nome: string, ocupacao: string) {
  const dicas: Record<string, { titulo: string; corpo: string }> = {
    mei: {
      titulo: '💡 Dica para MEI: separe o DAS antes de gastar',
      corpo: 'O DAS MEI vence todo dia 20. A melhor estratégia é separar o valor assim que receber qualquer pagamento. Guarde em uma conta separada e evite usar esse dinheiro para outros fins.'
    },
    autonomo: {
      titulo: '💡 Dica para autônomos: o cofre por recebimento',
      corpo: 'Toda vez que receber um pagamento, separe imediatamente 30% antes de gastar qualquer coisa. Desse valor: 20% para impostos, 10% para reserva. Assim você nunca é pego de surpresa.'
    },
    clt: {
      titulo: '💡 Dica CLT: invista o 13º antes de gastar',
      corpo: 'O 13º salário é uma oportunidade única de acelerar sua reserva de emergência ou investimentos. Planeje com antecedência onde esse dinheiro vai — antes de receber, não depois.'
    },
    estudante: {
      titulo: '💡 Dica para estudantes: comece pequeno, mas comece',
      corpo: 'R$ 50 por mês investidos no Tesouro Selic a 14,75% ao ano por 5 anos viram mais de R$ 4.200. O segredo não é o valor — é a consistência. Automatize a transferência todo dia de pagamento.'
    },
    default: {
      titulo: '💡 Dica financeira da semana',
      corpo: 'A regra mais simples das finanças pessoais: pague a si mesmo primeiro. Assim que receber seu salário ou pagamento, transfira automaticamente para investimentos. O que sobrar é o que você pode gastar.'
    }
  }

  const dica = dicas[ocupacao] ?? dicas.default

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: dica.titulo,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:#1D9E75;padding:28px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;font-size:20px;font-weight:900;margin:0">${dica.titulo}</h1>
        </div>
        <div style="padding:28px;background:#fff">
          <p style="font-size:15px;color:#444;line-height:1.7">${dica.corpo}</p>
          <div style="text-align:center;margin:24px 0">
            <a href="https://imoney.ia.br/dashboard/assessor" style="background:#1D9E75;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
              Perguntar ao Assessor IA →
            </a>
          </div>
        </div>
        <div style="background:#f8f9f8;padding:16px;text-align:center;border-radius:0 0 12px 12px">
          <p style="font-size:12px;color:#aaa;margin:0">iMoney · <a href="https://imoney.ia.br" style="color:#1D9E75;">imoney.ia.br</a></p>
        </div>
      </div>`
  })
}

// Email mensal de resumo — dia 1 de cada mês
async function enviarResumoMensal(email: string, nome: string) {
  const mesAnterior = new Date()
  mesAnterior.setMonth(mesAnterior.getMonth() - 1)
  const nomeMes = mesAnterior.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })

  await resend.emails.send({
    from: FROM,
    to: email,
    subject: `📅 Seu relatório financeiro de ${nomeMes}`,
    html: `
      <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
        <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0">
          <h1 style="color:#fff;font-size:22px;font-weight:900;margin:0">📅 Relatório de ${nomeMes}</h1>
        </div>
        <div style="padding:28px;background:#fff">
          <p style="font-size:15px;color:#444;line-height:1.7">Oi${nome ? ` ${nome}` : ''}! Um novo mês começou. É hora de revisar o que aconteceu e planejar o próximo.</p>
          <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0">
            <p style="font-size:14px;font-weight:700;color:#085041;margin:0 0 12px">Perguntas para refletir sobre ${nomeMes}:</p>
            <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Consegui poupar o que planejei?</p>
            <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Em qual categoria gastei mais do que esperava?</p>
            <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Minha meta principal avançou?</p>
            <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ O que posso cortar este mês?</p>
          </div>
          <div style="text-align:center;margin:24px 0">
            <a href="https://imoney.ia.br/dashboard" style="background:#1D9E75;color:#fff;padding:14px 28px;border-radius:10px;text-decoration:none;font-weight:700;font-size:15px">
              Ver relatório completo →
            </a>
          </div>
        </div>
        <div style="background:#f8f9f8;padding:16px;text-align:center;border-radius:0 0 12px 12px">
          <p style="font-size:12px;color:#aaa;margin:0">iMoney · <a href="https://imoney.ia.br" style="color:#1D9E75;">imoney.ia.br</a></p>
        </div>
      </div>`
  })
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    if (!users?.length) return NextResponse.json({ enviados: 0 })

    const hoje = new Date()
    const diaSemana = hoje.getDay() // 0=Dom, 1=Seg, etc
    const diaMes = hoje.getDate()

    let enviados = 0

    for (const user of users) {
      if (!user.email) continue

      const { data: perfil } = await supabase
        .from('user_profiles')
        .select('nome, ocupacao, plan')
        .eq('id', user.id)
        .single()

      const nome = perfil?.nome ?? ''
      const ocupacao = perfil?.ocupacao ?? 'default'

      // Segunda-feira: resumo semanal para todos
      if (diaSemana === 1) {
        await resend.emails.send({ from: FROM, to: user.email, subject: `📊 Seu resumo financeiro da semana`, html: '' })
        await enviarResumoSemanal(user.email, nome)
        enviados++
      }

      // Quarta-feira: dica financeira personalizada
      if (diaSemana === 3) {
        await enviarDicaSemanal(user.email, nome, ocupacao)
        enviados++
      }

      // Dia 1 de cada mês: relatório mensal
      if (diaMes === 1) {
        await enviarResumoMensal(user.email, nome)
        enviados++
      }
    }

    return NextResponse.json({ enviados, dia_semana: diaSemana, dia_mes: diaMes })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[cron/checkup]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
