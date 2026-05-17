import { baseHtml, ctaButton, card, htmlToText, EmailResult } from './_base'

export interface SumiuParams {
  nome: string
  metaPrincipal?: string
  userId: string
}

// D+0 (7 days since last login) — warm, zero pressure
export function sumiuEmail1({ nome, userId }: SumiuParams): EmailResult {
  const subject = 'Sentimos sua falta por aqui 🌱'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Oi, ${nome}! A gente sentiu sua falta 🌱</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Sei que a vida fica corrida — semanas vão passando rápido. Mas sua jornada financeira está aqui, esperando por você.</p>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">O Assessor IA guarda seu histórico, suas metas, tudo que você registrou. Basta retomar de onde parou.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">💡 Dica para retomar em 2 minutos</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Pergunte ao Assessor: <em>"como está meu mês?"</em> — ele te dá um resumo completo e sugere o próximo passo.</p>`)}
  ${ctaButton('Retomar minha jornada →', 'https://imoney.ia.br/dashboard/assessor')}
  <p style="margin:24px 0 0;color:#6b7280;font-size:13px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Qualquer dúvida, é só responder esse email. Leio tudo.</p>
  <p style="margin:16px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700">Gui<br><span style="font-weight:400;color:#6b7280">Fundador da iMoney</span></p>
</td></tr>`
  const html = baseHtml({ preheader: 'Sua jornada financeira continua esperando por você.', content, userId, trailSlug: 'sumiu' })
  return { subject, html, text: htmlToText(content) }
}

// D+7 — references goal if available, gentle nudge
export function sumiuEmail2({ nome, metaPrincipal, userId }: SumiuParams): EmailResult {
  const subject = 'Seu sonho financeiro continua aqui 💚'
  const metaBlock = metaPrincipal
    ? card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">🎯 Lembro do seu sonho: <strong>${metaPrincipal}</strong>.<br>Ele ainda está aqui, intacto. Cada passo conta — até os pequenos.</p>`)
    : card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">🎯 Seus sonhos não têm prazo de validade. O plano continua aqui quando você estiver pronto.</p>`)
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">${nome}, seus sonhos continuam aqui 💚</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Duas semanas. A vida acontece, e tudo bem. Mas quis dar um sinal de vida por aqui antes de sumir.</p>
  ${metaBlock}
  <p style="margin:16px 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">A iMoney não desiste de você. Quando você voltar — hoje, amanhã ou na semana que vem — tudo continua exatamente onde você deixou.</p>
  ${ctaButton('Voltar para a iMoney →', 'https://imoney.ia.br/dashboard')}
</td></tr>`
  const html = baseHtml({
    preheader: metaPrincipal ? `Sua meta "${metaPrincipal}" ainda espera por você.` : 'Seus sonhos continuam aqui.',
    content, userId, trailSlug: 'sumiu',
  })
  return { subject, html, text: htmlToText(content) }
}

// D+14 — personal message from Gui, no pressure, door stays open
export function sumiuEmail3({ nome, userId }: SumiuParams): EmailResult {
  const subject = 'Uma mensagem do Gui antes de pausar 🤍'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Uma última mensagem, ${nome} 🤍</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Esse é o Gui, fundador da iMoney. Faz três semanas que a gente não se vê, e quero ser honesto: não vou continuar mandando emails por um tempo.</p>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Mas quero que você saiba: sua conta fica aqui, seu histórico está guardado, e a iMoney está de braços abertos quando você decidir voltar — seja em uma semana, um mês ou um ano.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">Sem pressão. Sem julgamentos.</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Quando o momento for certo pra você cuidar das suas finanças, a gente vai estar aqui. É uma promessa.</p>`)}
  ${ctaButton('Abrir minha conta →', 'https://imoney.ia.br/dashboard')}
  <p style="margin:24px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700">Com carinho,<br>Gui<br><span style="font-weight:400;color:#6b7280">Fundador da iMoney</span></p>
</td></tr>`
  const html = baseHtml({ preheader: 'Sua conta fica aqui, para quando você quiser voltar.', content, userId, trailSlug: 'sumiu' })
  return { subject, html, text: htmlToText(content) }
}
