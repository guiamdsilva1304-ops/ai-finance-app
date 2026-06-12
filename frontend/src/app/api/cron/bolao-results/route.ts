import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// Mapeamento: nome em inglês da API → nome em português no nosso BD
const TEAM_MAP: Record<string, string> = {
  'Brazil': 'Brasil', 'Argentina': 'Argentina', 'France': 'França',
  'Germany': 'Alemanha', 'Spain': 'Espanha', 'Portugal': 'Portugal',
  'England': 'Inglaterra', 'Netherlands': 'Holanda', 'Belgium': 'Bélgica',
  'Uruguay': 'Uruguai', 'Mexico': 'México', 'United States': 'Estados Unidos',
  'USA': 'Estados Unidos', 'Canada': 'Canadá', 'Japan': 'Japão',
  'South Korea': 'Coreia do Sul', 'Australia': 'Austrália', 'Morocco': 'Marrocos',
  'Senegal': 'Senegal', 'Ghana': 'Gana', 'Egypt': 'Egito',
  "Ivory Coast": 'Costa do Marfim', "DR Congo": 'RD Congo', "Cape Verde": 'Cabo Verde',
  'Tunisia': 'Tunísia', 'Algeria': 'Argélia', 'Saudi Arabia': 'Arábia Saudita',
  'Iran': 'Irã', 'Iraq': 'Iraque', 'Jordan': 'Jordânia', 'Qatar': 'Catar',
  'Switzerland': 'Suíça', 'Czech Republic': 'Rep. Tcheca', 'Czechia': 'Rep. Tcheca',
  'Croatia': 'Croácia', 'Scotland': 'Escócia', 'Austria': 'Áustria',
  'Ukraine': 'Ucrânia', 'Norway': 'Noruega', 'Colombia': 'Colômbia',
  'Ecuador': 'Equador', 'Paraguay': 'Paraguai', 'Haiti': 'Haiti',
  'Panama': 'Panamá', 'New Zealand': 'Nova Zelândia', 'Kosovo': 'Kosovo',
  'Bosnia and Herzegovina': 'Bósnia-Herzegovina', 'Bosnia': 'Bósnia-Herzegovina',
  'Curacao': 'Curaçao', 'Uzbekistan': 'Uzbequistão',
};

const FINISHED_STATUSES = ['FT', 'AET', 'PEN'];

export async function GET(req: Request) {
  // Autenticação via CRON_SECRET (mesmo padrão dos outros crons)
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 1. Buscar jogos que já deveriam ter terminado (iniciados há 2h+) e ainda sem resultado
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    const { data: pending } = await supabase
      .from('world_cup_matches')
      .select('id, home_team, away_team, match_date')
      .neq('home_team', 'TBD')
      .neq('status', 'finished')
      .lt('match_date', twoHoursAgo);

    if (!pending?.length) {
      return NextResponse.json({ message: 'Nenhum jogo pendente', updated: 0 });
    }

    console.log(`[bolao-results] ${pending.length} jogos pendentes`);

    // 2. Buscar todos os fixtures da Copa 2026 na API-Football
    const apiRes = await fetch(
      'https://v3.football.api-sports.io/fixtures?league=1&season=2026',
      {
        headers: { 'x-apisports-key': process.env.API_FOOTBALL_KEY! },
        next: { revalidate: 0 },
      }
    );

    if (!apiRes.ok) {
      throw new Error(`API-Football error: ${apiRes.status}`);
    }

    const apiData = await apiRes.json();
    const fixtures: any[] = apiData.response ?? [];

    // Filtrar apenas jogos terminados
    const finishedFixtures = fixtures.filter(
      f => FINISHED_STATUSES.includes(f.fixture?.status?.short)
    );

    console.log(`[bolao-results] ${finishedFixtures.length} jogos finalizados na API`);

    let updated = 0;
    const errors: string[] = [];

    for (const match of pending) {
      // Encontrar fixture correspondente pelo nome dos times
      const fixture = finishedFixtures.find(f => {
        const apiHome = TEAM_MAP[f.teams.home.name] ?? f.teams.home.name;
        const apiAway = TEAM_MAP[f.teams.away.name] ?? f.teams.away.name;
        return apiHome === match.home_team && apiAway === match.away_team;
      });

      if (!fixture) {
        console.log(`[bolao-results] Sem resultado ainda: ${match.home_team} vs ${match.away_team}`);
        continue;
      }

      // Usar placar dos 90 minutos (fulltime), não ET/PEN
      const homeScore = fixture.score?.fulltime?.home ?? fixture.goals?.home;
      const awayScore = fixture.score?.fulltime?.away ?? fixture.goals?.away;

      if (homeScore === null || awayScore === null) continue;

      // Atualizar placar no BD
      const { error: updateErr } = await supabase
        .from('world_cup_matches')
        .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
        .eq('id', match.id);

      if (updateErr) {
        errors.push(`Match ${match.id}: ${updateErr.message}`);
        continue;
      }

      // Calcular pontos de todos os palpites desse jogo
      const { error: rpcErr } = await supabase
        .rpc('update_match_points', { p_match_id: match.id });

      if (rpcErr) {
        errors.push(`RPC match ${match.id}: ${rpcErr.message}`);
        continue;
      }

      console.log(`[bolao-results] ✅ ${match.home_team} ${homeScore}x${awayScore} ${match.away_team}`);
      updated++;
    }

    return NextResponse.json({
      message: 'Concluído',
      pending: pending.length,
      updated,
      errors: errors.length ? errors : undefined,
    });

  } catch (err) {
    console.error('[bolao-results] Erro:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
