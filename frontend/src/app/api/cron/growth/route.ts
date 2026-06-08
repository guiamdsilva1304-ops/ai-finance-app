import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
)
const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder')
const FROM = 'Gui da iMoney <gui@imoney.ia.br>'

async function jaEnviou(userId: string, campanha: string): Promise<boolean> {
  const { data } = await supabase
    .from('growth_campaigns')
    .select('id')
    .eq('user_id', userId)
    .eq('campanha', campanha)
    .maybeSingle()
  return !!data
}

async function registrarEnvio(userId: string, campanha: string) {
  await supabase.from('growth_campaigns').insert({ user_id: userId, campanha })
}

async function enviarEmail(to: string, subject: string, html: string) {
  await resend.emails.send({ from: FROM, to, subject, html })
}

async function campanhaQuaseLa(users: { id: string; email: string; nome: string }[]) {
  let enviados = 0
  const hoje = new Date(); hoje.setHours(0,0,0,0)

  for (const user of users) {
    if (await jaEnviou(user.id, 'quase_la')) continue

    const { count } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)
      .eq('role', 'user')
      .gte('created_at', hoje.toISOString())

    if ((count ?? 0) >= 8) {
      await enviarEmail(user.email,
        `Você está usando muito o Assessor IA 🔥 — que tal ilimitado?`,
        `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0">
            <div style="font-size:48px">🔥</div>
            <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0">Você está arrasando!</h1>
            <p style="color:#9FE1CB;margin:0;font-size:14px">Quase no limite do plano gratuito</p>
          </div>
          <div style="padding:28px;background:#fff">
            <p style="font-size:15px;color:#444;line-height:1.7">Oi${user.nome ? ` ${user.nome}` : ''}! Você já usou 8 das 10 mensagens gratuitas de hoje com o Assessor IA.</p>
            <p style="font-size:15px;color:#444;line-height:1.7">Isso significa que você está realmente usando a iMoney para melhorar suas finanças — e isso é ótimo!</p>
            <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0;text-align:center">
              <p style="font-size:14px;color:#085041;font-weight:700;margin:0 0 8px">Com o Pro você tem:</p>
              <p style="font-size:14px;color:#1D9E75;margin:6px 0">✓ Assessor IA ilimitado — sem cortes</p>
              <p style="font-size:14px;color:#1D9E75;margin:6px 0">✓ Metas ilimitadas</p>
              <p style="font-size:14px;color:#1D9E75;margin:6px 0">✓ Controle de investimentos</p>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="https://imoney.ia.br/dashboard/pro" style="background:linear-gradient(135deg,#0a3d28,#1D9E75);color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:16px">
                Assinar Pro — R$ 14,90/mês →
              </a>
            </div>
            <p style="font-size:12px;color:#aaa;text-align:center">Cancele quando quiser · Garantia de 7 dias</p>
          </div>
        </div>`
      )
      await registrarEnvio(user.id, 'quase_la')
      enviados++
    }
  }
  return enviados
}

async function campanhaPowerUser(users: { id: string; email: string; nome: string }[]) {
  let enviados = 0

  for (const user of users) {
    if (await jaEnviou(user.id, 'power_user')) continue

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) >= 10) {
      await enviarEmail(user.email,
        `${user.nome || 'Você'}, sua organização financeira está excelente 📊`,
        `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#1D9E75;padding:32px;text-align:center;border-radius:12px 12px 0 0">
            <div style="font-size:48px">📊</div>
            <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0">Você registrou ${count} transações!</h1>
          </div>
          <div style="padding:28px;background:#fff">
            <p style="font-size:15px;color:#444;line-height:1.7">Oi${user.nome ? ` ${user.nome}` : ''}! Você já registrou ${count} transações na iMoney — isso mostra que você está comprometido com sua vida financeira.</p>
            <p style="font-size:15px;color:#444;line-height:1.7">Quem chega nesse nível de organização costuma querer ir além — e o Pro foi feito exatamente pra isso.</p>
            <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0">
              <p style="font-size:14px;color:#085041;font-weight:700;margin:0 0 12px">O que você desbloquearia agora:</p>
              <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Assessor IA ilimitado para analisar todas essas transações</p>
              <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Relatórios mensais automáticos do seu histórico</p>
              <p style="font-size:14px;color:#1D9E75;margin:8px 0">→ Análise de padrões de gasto por categoria</p>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="https://imoney.ia.br/dashboard/pro" style="background:linear-gradient(135deg,#0a3d28,#1D9E75);color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:16px">
                Quero o Pro →
              </a>
            </div>
          </div>
        </div>`
      )
      await registrarEnvio(user.id, 'power_user')
      enviados++
    }
  }
  return enviados
}

async function campanhaMetaAmbiciosa(users: { id: string; email: string; nome: string }[]) {
  let enviados = 0

  for (const user of users) {
    if (await jaEnviou(user.id, 'meta_ambiciosa')) continue

    const { data: metas } = await supabase
      .from('metas')
      .select('nome, valor_alvo')
      .eq('user_id', user.id)
      .eq('concluida', false)
      .gte('valor_alvo', 10000)
      .limit(1)

    if (metas && metas.length > 0) {
      const meta = metas[0]
      await enviarEmail(user.email,
        `Sua meta de R$ ${Number(meta.valor_alvo).toLocaleString('pt-BR')} merece atenção especial 🎯`,
        `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:linear-gradient(135deg,#0a3d28,#1D9E75);padding:32px;text-align:center;border-radius:12px 12px 0 0">
            <div style="font-size:48px">🎯</div>
            <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0">Meta ambiciosa detectada!</h1>
          </div>
          <div style="padding:28px;background:#fff">
            <p style="font-size:15px;color:#444;line-height:1.7">Oi${user.nome ? ` ${user.nome}` : ''}! Você tem uma meta de <strong>R$ ${Number(meta.valor_alvo).toLocaleString('pt-BR')}</strong> — "${meta.nome}".</p>
            <p style="font-size:15px;color:#444;line-height:1.7">Para uma meta nesse valor, o Assessor IA ilimitado faz uma diferença enorme. Ele pode te dizer exatamente quanto guardar por mês, onde investir esse dinheiro e quando você vai chegar lá.</p>
            <div style="background:#fff8e6;border-left:4px solid #EF9F27;padding:16px;border-radius:0 8px 8px 0;margin:20px 0">
              <p style="font-size:14px;color:#633806;margin:0">💡 Com R$ 14,90/mês no Pro, o Assessor IA pode te ajudar a chegar na sua meta <strong>meses antes</strong> do previsto com a estratégia certa.</p>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="https://imoney.ia.br/dashboard/pro" style="background:linear-gradient(135deg,#0a3d28,#1D9E75);color:#fff;padding:16px 32px;border-radius:12px;text-decoration:none;font-weight:800;font-size:16px">
                Acelerar minha meta →
              </a>
            </div>
          </div>
        </div>`
      )
      await registrarEnvio(user.id, 'meta_ambiciosa')
      enviados++
    }
  }
  return enviados
}

async function campanhaAbandono(users: { id: string; email: string; nome: string; created_at: string }[]) {
  let enviados = 0

  for (const user of users) {
    if (await jaEnviou(user.id, 'abandono')) continue

    const diasDesde = Math.floor((Date.now() - new Date(user.created_at).getTime()) / 86400000)
    if (diasDesde < 3) continue

    const { count } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    if ((count ?? 0) === 0) {
      await enviarEmail(user.email,
        `${user.nome || 'Ei'}, sua conta ainda está zerada 👀`,
        `<div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto">
          <div style="background:#0a3d28;padding:32px;text-align:center;border-radius:12px 12px 0 0">
            <div style="font-size:48px">👀</div>
            <h1 style="color:#fff;font-size:22px;font-weight:900;margin:8px 0">Sua conta ainda está vazia</h1>
          </div>
          <div style="padding:28px;background:#fff">
            <p style="font-size:15px;color:#444;line-height:1.7">Oi${user.nome ? ` ${user.nome}` : ''}! Você criou sua conta na iMoney há ${diasDesde} dias mas ainda não registrou nenhuma transação.</p>
            <p style="font-size:15px;color:#444;line-height:1.7">A iMoney só consegue te ajudar quando tem dados para analisar. O primeiro passo é simples — registre uma transação agora, qualquer uma.</p>
            <div style="background:#f0fdf4;border-radius:12px;padding:20px;margin:20px 0">
              <p style="font-size:14px;color:#085041;font-weight:700;margin:0 0 8px">Comece com uma pergunta simples ao Assessor:</p>
              <p style="font-size:14px;color:#1D9E75;font-style:italic;margin:0">"Como devo organizar minhas finanças do zero?"</p>
            </div>
            <div style="text-align:center;margin:24px 0">
              <a href="https://imoney.ia.br/dashboard/transacoes" style="background:#1D9E75;color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:700;font-size:15px">
                Registrar primeira transação →
              </a>
            </div>
          </div>
        </div>`
      )
      await registrarEnvio(user.id, 'abandono')
      enviados++
    }
  }
  return enviados
}

export async function GET(req: NextRequest) {
  const secret = req.headers.get('authorization')?.replace('Bearer ', '')
    ?? new URL(req.url).searchParams.get('secret')
  if (secret !== process.env.CRON_SECRET)
    return NextResponse.json({ error: 'Nao autorizado' }, { status: 401 })

  try {
    const { data: { users } } = await supabase.auth.admin.listUsers()
    if (!users?.length) return NextResponse.json({ enviados: 0 })

    const userIds = users.map(u => u.id)
    const { data: perfis } = await supabase
      .from('user_profiles')
      .select('id, nome, plan')
      .in('id', userIds)
      .eq('plan', 'free')

    type AuthUser = { id: string; email?: string; created_at: string }
    const freeUsers = (perfis ?? []).map((p: { id: string; nome: string; plan: string }) => {
      const u = (users as AuthUser[]).find(u => u.id === p.id)
      return { id: p.id, email: u?.email ?? '', nome: p.nome ?? '', created_at: u?.created_at ?? '' }
    }).filter(u => u.email)

    console.log(`[GROWTH] Analisando ${freeUsers.length} usuários free`)

    const [r1, r2, r3, r4] = await Promise.all([
      campanhaQuaseLa(freeUsers),
      campanhaPowerUser(freeUsers),
      campanhaMetaAmbiciosa(freeUsers),
      campanhaAbandono(freeUsers),
    ])

    const total = r1 + r2 + r3 + r4
    console.log(`[GROWTH] Enviados: ${total} (quase_la:${r1} power:${r2} meta:${r3} abandono:${r4})`)

    return NextResponse.json({
      enviados: total,
      campanhas: { quase_la: r1, power_user: r2, meta_ambiciosa: r3, abandono: r4 }
    })
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error)
    console.error('[CRON GROWTH]', msg)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
