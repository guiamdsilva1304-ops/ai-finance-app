import { baseHtml, ctaButton, card, htmlToText, EmailResult } from './_base'

export interface FreeEngajadoParams {
  nome: string
  userId: string
}

// D+0 — acknowledge engagement, frame Pro as investing in the dream
export function freeEngajadoEmail1({ nome, userId }: FreeEngajadoParams): EmailResult {
  const subject = 'Você já descobriu o que a iMoney faz 💚'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">${nome}, você já entendeu o segredo 💚</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Você já usou o Assessor IA várias vezes. Isso é raro — a maioria das pessoas experimenta uma vez e esquece. Você ficou, voltou, continuou.</p>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">Isso significa que você já viu como a iMoney pode mudar sua relação com o dinheiro. Agora imagina sem nenhum limite.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">✨ iMoney Pro — menos de R$ 1/dia</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">• Assessor IA ilimitado, sem interruções<br>• Metas e planos personalizados<br>• Relatórios mensais automáticos<br>• Controle completo de investimentos</p>
  <p style="margin:8px 0 0;color:#1a3a1a;font-size:13px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.5">R$ 14,90/mês. Cancele quando quiser. Garantia de 7 dias.</p>`)}
  ${ctaButton('Investir no meu sonho por R$ 14,90/mês →', 'https://imoney.ia.br/dashboard/pro')}
  <p style="margin:24px 0 0;color:#6b7280;font-size:13px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Dúvidas? Responde esse email. Eu mesmo respondo.</p>
  <p style="margin:12px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700">Gui<br><span style="font-weight:400;color:#6b7280">Fundador da iMoney</span></p>
</td></tr>`
  const html = baseHtml({
    preheader: 'Você já viu o que a iMoney faz. Imagina sem limites.',
    content, userId, trailSlug: 'free-engajado',
  })
  return { subject, html, text: htmlToText(content) }
}

// D+3 — social proof, remove last objections
export function freeEngajadoEmail2({ nome, userId }: FreeEngajadoParams): EmailResult {
  const subject = 'Quem foi Pro conta: valeu cada centavo'
  const content = `
<tr><td style="padding:36px 32px 32px">
  <h1 style="margin:0 0 16px;color:#1a3a1a;font-family:Nunito,-apple-system,system-ui,sans-serif;font-size:22px;font-weight:900;line-height:1.3">Quem foi Pro conta: valeu cada centavo</h1>
  <p style="margin:0 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">${nome}, quero te contar o que usuários Pro costumam dizer depois do primeiro mês.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-style:italic;line-height:1.7">"Finalmente entendi pra onde ia meu dinheiro. Em 3 meses quita uma dívida que carregava há 2 anos."</p>
  <p style="margin:10px 0 0;color:#6b7280;font-size:12px;font-family:Nunito,-apple-system,system-ui,sans-serif">— Lucas M., 26 anos, São Paulo</p>`)}
  <p style="margin:16px 0 14px;color:#374151;font-size:15px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.7">O segredo não é ganhar mais. É saber onde cada real está indo — e ter um plano claro para chegar onde você quer.</p>
  ${card(`<p style="margin:0;color:#1a3a1a;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:700;line-height:1.5">🔒 Sem risco: garantia de 7 dias</p>
  <p style="margin:8px 0 0;color:#374151;font-size:14px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.6">Se em 7 dias você não sentir diferença, devolvemos tudo — sem perguntas. Menos de R$ 1/dia para investir no seu futuro.</p>`)}
  ${ctaButton('Começar meu Pro agora →', 'https://imoney.ia.br/dashboard/pro')}
</td></tr>`
  const html = baseHtml({
    preheader: 'Garantia de 7 dias. Menos de R$ 1/dia para transformar sua vida financeira.',
    content, userId, trailSlug: 'free-engajado',
  })
  return { subject, html, text: htmlToText(content) }
}
