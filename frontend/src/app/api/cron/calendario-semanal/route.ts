import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 60;

const resend = new Resend(process.env.RESEND_API_KEY);
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.imoneycronsecret2026;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    console.log('[calendario-semanal] Buscando calendário no Supabase...');

    // Busca o calendário mais recente com status pending
    const { data, error } = await supabase
      .from('content_pipeline')
      .select('*')
      .eq('type', 'calendario_semanal')
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('Nenhum calendário pendente encontrado no Supabase');
    }

    const calendarData = data.content;
    const weekLabel = data.week;

    console.log('[calendario-semanal] Enviando email para semana', weekLabel);

    const html = buildEmailHTML(calendarData, weekLabel);
    const emailResult = await resend.emails.send({
      from: 'iMoney <gui@imoney.ia.br>',
      to: 'guiamdsilva1304@gmail.com',
      subject: `📅 Calendário iMoney — Semana ${weekLabel}`,
      html,
    });

    // Marca como enviado
    await supabase
      .from('content_pipeline')
      .update({ status: 'sent' })
      .eq('id', data.id);

    console.log('[calendario-semanal] Email enviado:', emailResult.data?.id);

    return NextResponse.json({
      ok: true,
      email_id: emailResult.data?.id,
      week: weekLabel,
    });
  } catch (error) {
    console.error('[calendario-semanal] Erro:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}

function buildEmailHTML(data: any, weekLabel: string): string {
  const pilarColor: Record<string, string> = {
    Sonho: '#7C3AED',
    Educação: '#00C853',
    Produto: '#1a3a1a',
    Conquista: '#F59E0B',
  };

  const diasHTML = (data.dias ?? []).map((dia: any) => {
    const cor = pilarColor[dia.pilar] ?? '#00C853';
    const isCarrossel = dia.formato?.toLowerCase().includes('carrossel');

    const conteudoHTML = Array.isArray(dia.conteudo) && dia.conteudo.length
      ? `<div style="margin-top:14px;">
          <strong style="color:#1a3a1a;font-size:13px;">${isCarrossel ? '📌 Slides' : '🎬 Script'}:</strong>
          <ol style="margin:8px 0 0 0;padding-left:20px;color:#374151;font-size:13px;">
            ${dia.conteudo.map((s: string) => `<li style="margin-bottom:6px;">${s}</li>`).join('')}
          </ol>
        </div>`
      : '';

    return `
      <div style="background:#fff;border:1px solid #e5e7eb;border-radius:14px;padding:22px;margin-bottom:18px;">
        <div style="display:flex;align-items:center;gap:10px;margin-bottom:14px;flex-wrap:wrap;">
          <span style="background:${cor};color:#fff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;">${dia.pilar}</span>
          <span style="background:#f3f4f6;padding:4px 14px;border-radius:20px;font-size:12px;color:#6b7280;">${dia.formato}</span>
        </div>
        <h3 style="margin:0 0 4px 0;color:#1a3a1a;font-size:17px;font-weight:800;">${dia.dia} ${dia.data} — ${dia.tema}</h3>
        <p style="margin:0 0 14px 0;color:#6b7280;font-size:13px;font-style:italic;">${dia.angulo}</p>

        <div style="background:#f0fdf4;border-left:4px solid #00C853;padding:14px;border-radius:0 10px 10px 0;margin-bottom:14px;">
          <strong style="color:#1a3a1a;font-size:12px;display:block;margin-bottom:6px;">📝 Caption:</strong>
          <p style="margin:0;color:#374151;font-size:13px;white-space:pre-line;line-height:1.6;">${dia.copy_caption}</p>
        </div>

        ${conteudoHTML}

        <div style="margin-top:14px;padding-top:14px;border-top:1px solid #f3f4f6;">
          <strong style="color:#1a3a1a;font-size:12px;">🎨 Prompt Visual:</strong>
          <p style="margin:6px 0 0 0;color:#6b7280;font-size:12px;font-style:italic;">${dia.prompt_visual}</p>
        </div>

        <div style="margin-top:12px;">
          ${(dia.hashtags ?? []).map((h: string) =>
            `<span style="background:#f0fdf4;color:#00C853;padding:3px 10px;border-radius:12px;font-size:11px;margin:2px 4px 2px 0;display:inline-block;">${h}</span>`
          ).join('')}
        </div>
      </div>`;
  }).join('');

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#f9fafb;font-family:Arial,sans-serif;">
  <div style="max-width:640px;margin:0 auto;padding:24px 16px;">

    <div style="background:linear-gradient(135deg,#1a3a1a 0%,#00C853 100%);border-radius:16px;padding:32px;text-align:center;margin-bottom:28px;">
      <h1 style="margin:0;color:#fff;font-size:26px;font-weight:900;">📅 Calendário iMoney</h1>
      <p style="margin:8px 0 0 0;color:rgba(255,255,255,0.85);font-size:15px;">Semana ${weekLabel}</p>
    </div>

    ${diasHTML}

    <div style="text-align:center;padding:24px;color:#9ca3af;font-size:12px;border-top:1px solid #e5e7eb;margin-top:8px;">
      <p style="margin:0;font-weight:700;color:#1a3a1a;">iMoney · imoney.ia.br</p>
      <p style="margin:4px 0 0 0;">Gerado automaticamente toda segunda às 8h BRT</p>
    </div>
  </div>
</body>
</html>`;
}
