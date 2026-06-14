import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY ?? 're_placeholder');

// Só age a partir deste dia (UTC) — 1 dia após a final da Copa 2026 (19/07)
const DISTRIBUTION_DATE = '2026-07-20';

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = new Date().toISOString().slice(0, 10); // 'YYYY-MM-DD' UTC
  if (today < DISTRIBUTION_DATE) {
    return NextResponse.json({ status: 'ainda não é hora', hoje: today, a_partir_de: DISTRIBUTION_DATE });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  // Idempotência: aborta se algum prêmio já foi distribuído
  const { count } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .not('bolao_prize', 'is', null);

  if ((count ?? 0) > 0) {
    return NextResponse.json({ status: 'prêmios já distribuídos', registros: count });
  }

  // Busca top 3 do ranking
  const { data: top3, error: rankErr } = await supabase
    .from('world_cup_ranking')
    .select('user_id, display_name, email, total_points, ranking')
    .order('total_points', { ascending: false })
    .limit(3);

  if (rankErr || !top3 || top3.length < 2) {
    console.error('[bolao-prizes] Erro ao buscar ranking:', rankErr?.message ?? 'menos de 2 participantes');
    return NextResponse.json(
      { error: 'Não foi possível determinar o top 2', detail: rankErr?.message },
      { status: 500 },
    );
  }

  const [primeiro, segundo, terceiro] = top3;
  const resultado: Record<string, unknown> = {};

  // ── 1º lugar: Premium vitalício ─────────────────────────────────────────────
  const { error: err1 } = await supabase
    .from('user_profiles')
    .update({
      plan: 'premium',
      plan_expires_at: null,
      premium_expires_at: null,
      bolao_prize: 'Premium vitalício 🏆',
      bolao_prize_expires_at: null,
    })
    .eq('user_id', primeiro.user_id);

  if (err1) {
    console.error('[bolao-prizes] Erro ao premiar 1º lugar:', err1.message);
    return NextResponse.json({ error: `Erro ao premiar 1º lugar: ${err1.message}` }, { status: 500 });
  }

  console.log(`[bolao-prizes] 🥇 1º lugar: ${primeiro.display_name} (${primeiro.user_id}) — Premium vitalício`);
  resultado['1_lugar'] = { user_id: primeiro.user_id, nome: primeiro.display_name, premio: 'Premium vitalício 🏆' };

  // ── 2º lugar: Pro vitalício (sem downgrade se já for premium) ───────────────
  const { data: perfil2, error: perfilErr } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('user_id', segundo.user_id)
    .single();

  if (perfilErr || !perfil2) {
    console.error('[bolao-prizes] Erro ao buscar perfil do 2º lugar:', perfilErr?.message);
    return NextResponse.json({ error: `Erro ao buscar perfil do 2º lugar: ${perfilErr?.message}` }, { status: 500 });
  }

  const jaEhPremium = perfil2.plan === 'premium';
  const update2 = jaEhPremium
    ? {
        plan: 'premium',
        plan_expires_at: null,
        premium_expires_at: null,
        bolao_prize: 'Pro vitalício (convertido em Premium vitalício)',
        bolao_prize_expires_at: null,
      }
    : {
        plan: 'pro',
        plan_expires_at: null,
        premium_expires_at: null,
        bolao_prize: 'Pro vitalício 🥈',
        bolao_prize_expires_at: null,
      };

  const { error: err2 } = await supabase
    .from('user_profiles')
    .update(update2)
    .eq('user_id', segundo.user_id);

  if (err2) {
    console.error('[bolao-prizes] Erro ao premiar 2º lugar:', err2.message);
    return NextResponse.json({ error: `Erro ao premiar 2º lugar: ${err2.message}` }, { status: 500 });
  }

  console.log(`[bolao-prizes] 🥈 2º lugar: ${segundo.display_name} (${segundo.user_id}) — ${update2.bolao_prize}`);
  resultado['2_lugar'] = { user_id: segundo.user_id, nome: segundo.display_name, premio: update2.bolao_prize };

  // ── 3º lugar: desconto na assinatura por 1 ano (sem alterar o plan) ─────────
  if (terceiro) {
    const PRIZE_3 = '3º lugar 🥉 — 30% off Pro ou 50% off Premium no 1º ano';
    const EXPIRA_3 = '2027-07-20T00:00:00Z';

    const { error: err3 } = await supabase
      .from('user_profiles')
      .update({
        bolao_prize: PRIZE_3,
        bolao_prize_expires_at: EXPIRA_3,
      })
      .eq('user_id', terceiro.user_id);

    if (err3) {
      console.error('[bolao-prizes] Erro ao premiar 3º lugar:', err3.message);
      return NextResponse.json({ error: `Erro ao premiar 3º lugar: ${err3.message}` }, { status: 500 });
    }

    console.log(`[bolao-prizes] 🥉 3º lugar: ${terceiro.display_name} (${terceiro.user_id}) — ${PRIZE_3}`);
    resultado['3_lugar'] = {
      user_id: terceiro.user_id,
      nome: terceiro.display_name,
      premio: PRIZE_3,
      expira_em: EXPIRA_3,
    };

    // Email de aviso para o 3º lugar (best-effort)
    if (terceiro.email) {
      try {
        await resend.emails.send({
          from: 'Gui da iMoney <gui@imoney.ia.br>',
          to: terceiro.email,
          subject: '🥉 Você subiu ao pódio do Bolão da Copa 2026!',
          html: `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body style="margin:0;padding:0;background:#f0fdf4;font-family:Nunito,Arial,sans-serif">
<table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)">
<tr><td style="background:linear-gradient(135deg,#16a34a,#22c55e);padding:28px 32px;text-align:center">
<span style="color:#ffffff;font-size:26px;font-weight:900;letter-spacing:-0.5px">iMoney</span>
<p style="color:#dcfce7;font-size:13px;margin:4px 0 0;font-weight:600">Seu assessor financeiro com IA</p>
</td></tr>
<tr><td style="padding:36px 32px;color:#374151;font-size:15px;line-height:1.8">
<p style="margin:0 0 12px">Oi, ${terceiro.display_name}!</p>
<p style="margin:0 0 12px">Sua jornada no Bolão da Copa 2026 da iMoney terminou em <strong>3º lugar no ranking geral</strong> — uma conquista e tanto entre todos os participantes! 🎉</p>
<p style="margin:0 0 12px">Como reconhecimento, você desbloqueou um benefício exclusivo: <strong>30% de desconto no plano Pro ou 50% de desconto no plano Premium</strong>, válido durante o primeiro ano da sua assinatura.</p>
<p style="margin:0 0 12px">Escolha o plano que mais te aproxima do seu próximo sonho e invista nele com esse desconto especial:</p>
<p style="margin:0 0 12px">👉 <a href="https://imoney.ia.br/dashboard/pro" style="color:#16a34a;font-weight:700">Ver planos: https://imoney.ia.br/dashboard/pro</a></p>
<p style="margin:0 0 12px">Esse benefício está disponível até 20/07/2027.</p>
<p style="margin:0 0 12px">Parabéns pela conquista — você merece!<br>Gui, fundador da iMoney</p>
</td></tr>
<tr><td style="padding:16px 32px 24px;border-top:1px solid #f0fdf4;text-align:center">
<p style="color:#9ca3af;font-size:12px;margin:0">Você recebe este email por ser usuário do iMoney.</p>
</td></tr>
</table></td></tr></table>
</body></html>`,
        });
      } catch (emailErr) {
        console.error('[bolao-prizes] Falha ao enviar email para 3º lugar:', emailErr);
      }
    }
  }

  return NextResponse.json({ status: 'prêmios distribuídos com sucesso', resultado });
}
