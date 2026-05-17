export interface EmailResult {
  subject: string
  html: string
  text: string
}

export function baseHtml({
  preheader,
  content,
  userId,
  trailSlug,
}: {
  preheader: string
  content: string
  userId: string
  trailSlug: string
}): string {
  const unsubUrl = `https://imoney.ia.br/api/unsubscribe?uid=${userId}&trail=${trailSlug}`
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>iMoney</title>
<link href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,-apple-system,system-ui,sans-serif">
<div style="display:none;max-height:0;overflow:hidden;mso-hide:all">${preheader}&nbsp;&zwnj;&nbsp;&zwnj;&nbsp;&zwnj;</div>
<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="background:#f0fdf4">
<tr><td align="center" style="padding:32px 16px">
<table width="600" cellpadding="0" cellspacing="0" role="presentation" style="max-width:600px;width:100%;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.07)">
<tr><td align="center" style="background:#1a3a1a;padding:24px 32px">
<img src="https://imoney.ia.br/logo.png" alt="iMoney" height="36" style="display:inline-block;border:0;max-height:36px">
</td></tr>
${content}
<tr><td style="padding:20px 32px 28px;background:#f8fdf9;border-top:1px solid #e8f5e9;text-align:center">
<p style="margin:0 0 6px;color:#9ca3af;font-size:11px;font-family:Nunito,-apple-system,system-ui,sans-serif;line-height:1.5">
iMoney &middot; Rua Macedo Sobrinho, 46 &middot; Brasil
</p>
<p style="margin:0;color:#9ca3af;font-size:11px;font-family:Nunito,-apple-system,system-ui,sans-serif">
<a href="${unsubUrl}" style="color:#9ca3af;text-decoration:underline">Cancelar esta trilha de emails</a>
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

export function ctaButton(label: string, url: string): string {
  return `<table cellpadding="0" cellspacing="0" role="presentation" style="margin:28px auto 0">
<tr><td align="center" style="border-radius:8px;background:#00C853">
<a href="${url}" style="display:inline-block;background:#00C853;color:#ffffff;text-decoration:none;font-family:Nunito,-apple-system,system-ui,sans-serif;font-weight:800;font-size:15px;padding:14px 32px;border-radius:8px;letter-spacing:0.2px;white-space:nowrap">${label}</a>
</td></tr>
</table>`
}

export function card(content: string): string {
  return `<table width="100%" cellpadding="0" cellspacing="0" role="presentation" style="margin:16px 0">
<tr><td style="background:#E8F5E9;border-radius:10px;padding:16px 20px;font-family:Nunito,-apple-system,system-ui,sans-serif">
${content}
</td></tr>
</table>`
}

export function htmlToText(html: string): string {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/gi, '$2 ($1)')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&middot;/g, '·')
    .replace(/&zwnj;/g, '')
    .replace(/\s{2,}/g, '\n')
    .trim()
}
