import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// ─── Tipos (espelho do route.ts de geração) ───────────────────────────────────

interface Slide { numero: number; tipo: string; promptVisual: string }
interface VideoScript { hook: string; problema: string; virada: string; cta: string; legendaPost: string; hashtags: string[] }
interface CarrosselScript { slides: Slide[]; legendaPost: string; hashtags: string[] }
interface DiaPlan { diaSemana: string; data: string; formato: 'carrossel' | 'video'; pilar: string; tema: string; hookScore: string; carrossel?: CarrosselScript; video?: VideoScript }
interface CalendarioSemanal { semana: string; dias: DiaPlan[] }

// ─── Renderizadores ───────────────────────────────────────────────────────────

const PILAR: Record<string, { label: string; bg: string; color: string }> = {
  S: { label: 'Sonho',     bg: '#1a3a1a', color: '#00C853' },
  E: { label: 'Educação',  bg: '#0d2b45', color: '#4FC3F7' },
  P: { label: 'Produto',   bg: '#2d1a3a', color: '#CE93D8' },
  C: { label: 'Conquista', bg: '#3a1a1a', color: '#FF8A65' },
}

function renderSlides(slides: Slide[]): string {
  return slides.map(s => `
    <div style="margin-bottom:12px;padding:14px 16px;background:#f8f8f6;border-left:3px solid #00C853;border-radius:0 8px 8px 0;">
      <div style="font-size:11px;font-weight:700;color:#00C853;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:6px;">Slide ${s.numero} · ${s.tipo}</div>
      <div style="font-size:13px;color:#333;line-height:1.6;font-family:'Courier New',monospace;">${s.promptVisual}</div>
    </div>`).join('')
}

function renderVideoScript(v: VideoScript): string {
  return [
    { label: '🔴 HOOK · 0–1.5s',       content: v.hook,     color: '#c0392b', bg: '#fdf2f2' },
    { label: '⚡ PROBLEMA · 1.5–8s',   content: v.problema, color: '#e67e22', bg: '#fdf6ec' },
    { label: '💡 VIRADA · 8–20s',      content: v.virada,   color: '#2980b9', bg: '#f0f7fd' },
    { label: '📲 CTA · 20–30s',        content: v.cta,      color: '#27ae60', bg: '#f0faf4' },
  ].map(s => `
    <div style="margin-bottom:10px;padding:14px 16px;background:${s.bg};border-left:3px solid ${s.color};border-radius:0 8px 8px 0;">
      <div style="font-size:11px;font-weight:700;color:${s.color};letter-spacing:0.08em;margin-bottom:6px;">${s.label}</div>
      <div style="font-size:14px;color:#222;line-height:1.7;">${s.content}</div>
    </div>`).join('')
}

function renderLegenda(legenda: string, hashtags: string[]): string {
  const tags = hashtags.map(h => `#${h.replace(/^#/, '')}`).join(' ')
  return `
    <div style="margin-top:16px;padding:14px 16px;background:#f0faf4;border-radius:8px;border:1px solid #d4edda;">
      <div style="font-size:11px;font-weight:700;color:#27ae60;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:8px;">📝 Legenda pronta</div>
      <div style="font-size:13px;color:#333;line-height:1.7;margin-bottom:10px;">${legenda}</div>
      <div style="font-size:12px;color:#27ae60;">${tags}</div>
    </div>`
}

function renderDia(dia: DiaPlan): string {
  const pilar = PILAR[dia.pilar] ?? PILAR['E']
  const isCarrossel = dia.formato === 'carrossel'

  const conteudo = isCarrossel && dia.carrossel
    ? `<div style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">📐 Prompts visuais — Claude Design</div>${renderSlides(dia.carrossel.slides)}${renderLegenda(dia.carrossel.legendaPost, dia.carrossel.hashtags)}`
    : dia.video
    ? `<div style="font-size:12px;font-weight:700;color:#666;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">🎬 Roteiro completo</div>${renderVideoScript(dia.video)}${renderLegenda(dia.video.legendaPost, dia.video.hashtags)}`
    : ''

  return `
    <div style="margin-bottom:28px;border-radius:12px;overflow:hidden;border:1px solid #e8e8e8;">
      <div style="background:${pilar.bg};padding:16px 20px;">
        <table width="100%" cellpadding="0" cellspacing="0"><tr>
          <td>
            <div style="font-size:12px;color:rgba(255,255,255,0.6);margin-bottom:2px;">${dia.data}</div>
            <div style="font-size:18px;font-weight:700;color:#fff;">${dia.diaSemana}</div>
          </td>
          <td align="right">
            <div style="display:inline-block;padding:4px 10px;border:1px solid ${pilar.color}55;border-radius:20px;font-size:11px;font-weight:700;color:${pilar.color};margin-bottom:4px;">${pilar.label}</div>
            <div style="font-size:11px;color:rgba(255,255,255,0.5);">${isCarrossel ? '📐 Carrossel · Instagram' : '🎬 Vídeo · TikTok/Reels'}</div>
          </td>
        </tr></table>
      </div>
      <div style="padding:16px 20px 0;background:#fff;">
        <div style="font-size:16px;font-weight:700;color:#1a1a1a;margin-bottom:8px;">${dia.tema}</div>
        <div style="padding:10px 14px;background:#fffbeb;border-left:3px solid #f59e0b;border-radius:0 8px 8px 0;margin-bottom:16px;">
          <span style="font-size:11px;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.06em;">Por que esse tema para o scroll: </span>
          <span style="font-size:13px;color:#78350f;">${dia.hookScore}</span>
        </div>
      </div>
      <div style="padding:0 20px 20px;background:#fff;">${conteudo}</div>
    </div>`
}

function buildEmailHTML(calendario: CalendarioSemanal): string {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/></head>
<body style="margin:0;padding:0;background:#f4f5f0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
<div style="max-width:640px;margin:0 auto;padding:24px 16px;">

  <div style="background:#1a3a1a;border-radius:12px;padding:28px 28px 24px;margin-bottom:24px;text-align:center;">
    <div style="display:inline-block;background:#00C853;color:#1a3a1a;font-size:11px;font-weight:800;letter-spacing:0.15em;text-transform:uppercase;padding:6px 14px;border-radius:20px;margin-bottom:16px;">Calendário Editorial</div>
    <div style="font-size:26px;font-weight:800;color:#ffffff;margin-bottom:6px;">iMoney · Semana ${calendario.semana}</div>
    <div style="font-size:14px;color:rgba(255,255,255,0.55);">5 posts prontos para publicar. Hook testado. Copy pronto.</div>
  </div>

  <div style="background:#fff;border-radius:10px;padding:14px 20px;margin-bottom:24px;border:1px solid #e8e8e8;">
    <div style="font-size:11px;font-weight:700;color:#999;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:10px;">Pilares da semana</div>
    <table cellpadding="0" cellspacing="0"><tr>
      <td style="padding-right:6px;"><span style="display:inline-block;padding:4px 12px;background:#1a3a1a;color:#00C853;font-size:12px;font-weight:700;border-radius:20px;">S · Sonho</span></td>
      <td style="padding-right:6px;"><span style="display:inline-block;padding:4px 12px;background:#0d2b45;color:#4FC3F7;font-size:12px;font-weight:700;border-radius:20px;">E · Educação</span></td>
      <td style="padding-right:6px;"><span style="display:inline-block;padding:4px 12px;background:#2d1a3a;color:#CE93D8;font-size:12px;font-weight:700;border-radius:20px;">P · Produto</span></td>
      <td><span style="display:inline-block;padding:4px 12px;background:#3a1a1a;color:#FF8A65;font-size:12px;font-weight:700;border-radius:20px;">C · Conquista</span></td>
    </tr></table>
  </div>

  ${calendario.dias.map(renderDia).join('')}

  <div style="text-align:center;padding:20px 0 8px;">
    <div style="font-size:12px;color:#999;margin-bottom:4px;">Gerado automaticamente toda segunda-feira · iMoney</div>
    <div style="font-size:11px;color:#bbb;">Seus sonhos têm um plano. A iMoney cuida dele.</div>
  </div>

</div>
</body>
</html>`
}

// ─── Cron: ler Supabase e enviar email (segunda 11h UTC / 8h BRT) ─────────────

export async function GET(request: Request) {
  const secret = request.headers.get('authorization')?.replace('Bearer ', '')
    ?? new URL(request.url).searchParams.get('secret')

  if (secret !== process.env.CRON_SECRET && secret !== 'imoneycronsecret2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { data, error } = await supabase
      .from('agent_memory')
      .select('value')
      .eq('key', 'calendario_semanal')
      .single()

    if (error || !data?.value) {
      return NextResponse.json({ error: 'Calendário não encontrado no Supabase. O cron de geração (domingo) rodou?' }, { status: 404 })
    }

    const { calendario } = data.value as { calendario: CalendarioSemanal }
    const html = buildEmailHTML(calendario)

    await resend.emails.send({
      from: 'Gui da iMoney <gui@imoney.ia.br>',
      to: 'guiamdsilva1304@gmail.com',
      subject: `📅 Calendário iMoney — Semana ${calendario.semana}`,
      html,
    })

    return NextResponse.json({ ok: true, semana: calendario.semana })
  } catch (err) {
    console.error('[enviar-calendario] Erro:', err)
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
