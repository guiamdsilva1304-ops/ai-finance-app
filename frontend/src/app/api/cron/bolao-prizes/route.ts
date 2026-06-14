import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

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

  // Busca top 2 do ranking
  const { data: top2, error: rankErr } = await supabase
    .from('world_cup_ranking')
    .select('user_id, display_name, total_points, ranking')
    .order('total_points', { ascending: false })
    .limit(2);

  if (rankErr || !top2 || top2.length < 2) {
    console.error('[bolao-prizes] Erro ao buscar ranking:', rankErr?.message ?? 'menos de 2 participantes');
    return NextResponse.json(
      { error: 'Não foi possível determinar o top 2', detail: rankErr?.message },
      { status: 500 },
    );
  }

  const [primeiro, segundo] = top2;
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

  return NextResponse.json({ status: 'prêmios distribuídos com sucesso', resultado });
}
