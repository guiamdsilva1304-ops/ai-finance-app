import { baseHtml, ctaButton, card, htmlToText, EmailResult } from './_base'

export interface MetaOrfaParams {
  nome: string
  metaPrincipal?: string
  valorFaltante?: number
  userId: string
}

// D+0 (5 days after goal created, no transactions yet) — low friction, one clear action
export function metaOrfaEmail1({ nome, metaPrincipal, valorFaltante, userId }: MetaOrfaParams): EmailResult {
  const subject = 'Sua meta está esperando o primeiro passo'
  const metaNome = metaPrincipal ?? 'sua meta'
  const valorBlock = valorFaltante
    ? `<p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Faltam <strong>R$ ${valorFaltante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para a conquista. O primeiro registro já conta como progresso.</p>`
    : `<p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">O primeiro registro já conta como progresso. Não precisa ser perfeito — precisa começar.</p>`
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Sua meta criou raízes, ${nome} 🌱</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Você criou <strong>${metaNome}</strong> — isso já é um passo enorme. Mas toda conquista precisa do primeiro movimento real.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">🎯 Sua próxima ação: registrar a primeira transação</p>
  ${valorBlock}`)}
  <p style="margin:16px 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Leva menos de 30 segundos. Abra o painel, clique em <strong>Nova transação</strong> e registre qualquer valor — mesmo que pequeno. Cada real registrado é um passo na direção do seu sonho.</p>
  ${ctaButton('Registrar minha primeira transação →', 'https://imoney.ia.br/dashboard/transacoes')}
</td></tr>`
  const html = baseHtml({
    preheader: `Sua meta "${metaNome}" está esperando pelo primeiro passo.`,
    content, userId, trailSlug: 'meta-orfa',
  })
  return { subject, html, text: htmlToText(content) }
}

// D+5 — AI advisor as a guide to unblock, more direct CTA
export function metaOrfaEmail2({ nome, metaPrincipal, userId }: MetaOrfaParams): EmailResult {
  const subject = 'O Assessor IA pode destravar sua meta 💡'
  const metaNome = metaPrincipal ?? 'sua meta'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Travou? O Assessor IA está aqui pra ajudar 💡</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">${nome}, sua meta <strong>${metaNome}</strong> ainda não deu o primeiro passo. Às vezes a gente trava porque não sabe por onde começar — e é exatamente pra isso que existe o Assessor IA.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">💬 Pergunte agora ao Assessor:</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-style:italic;line-height:1.6">"Quanto preciso guardar por mês para atingir ${metaNome}?"</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-style:italic;line-height:1.6">"Por onde começo com o que ganho hoje?"</p>`)}
  <p style="margin:16px 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Ele analisa sua renda, seus gastos e monta um plano realista — sem julgamentos, com clareza.</p>
  ${ctaButton('Falar com o Assessor IA →', 'https://imoney.ia.br/dashboard/assessor')}
</td></tr>`
  const html = baseHtml({
    preheader: 'O Assessor IA monta um plano para você começar ainda hoje.',
    content, userId, trailSlug: 'meta-orfa',
  })
  return { subject, html, text: htmlToText(content) }
}
