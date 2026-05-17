import { baseHtml, ctaButton, card, htmlToText, EmailResult } from './_base'

export interface QuaseLaParams {
  nome: string
  metaPrincipal?: string
  valorFaltante?: number
  userId: string
}

// Single email — celebratory, momentum-focused, urgency is intrinsic (so close!)
export function quaseLaEmail1({ nome, metaPrincipal, valorFaltante, userId }: QuaseLaParams): EmailResult {
  const subject = 'Você está a um passo do seu sonho 🏁'
  const metaNome = metaPrincipal ?? 'sua meta'
  const faltaBlock = valorFaltante != null
    ? `<p style="margin:8px 0 0;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Faltam só <strong style="color:#00C853">R$ ${valorFaltante.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong> para a linha de chegada. Você está mais perto do que já esteve.</p>`
    : `<p style="margin:8px 0 0;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Você já passou de 70% da meta. Pouquíssimas pessoas chegam até aqui — e você chegou.</p>`
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Você está quase lá, ${nome}! 🏁</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Olha o que você construiu: <strong>${metaNome}</strong> está a pouquíssimo de se tornar realidade.</p>
  ${faltaBlock}
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">🚀 Não deixe o impulso esfriar</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Registre seu próximo aporte agora — qualquer valor. O momentum é a sua maior ferramenta. Conquistas não acontecem num único grande salto; acontecem num passo de cada vez.</p>`)}
  <p style="margin:16px 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">O Assessor IA pode ajudar a calcular quanto falta e sugerir de onde vem esse valor — se quiser, é só perguntar.</p>
  ${ctaButton('Dar o próximo passo →', 'https://imoney.ia.br/dashboard/metas')}
  <p style="margin:24px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700">Torcendo pela sua conquista,<br>Gui<br><span style="font-weight:400;color:#6b7280">Fundador da iMoney</span></p>
</td></tr>`
  const html = baseHtml({
    preheader: `Você passou de 70% da meta "${metaNome}". Não para agora.`,
    content, userId, trailSlug: 'quase-la',
  })
  return { subject, html, text: htmlToText(content) }
}
