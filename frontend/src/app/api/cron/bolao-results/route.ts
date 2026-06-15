import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const OPENFOOTBALL_URL =
  'https://raw.githubusercontent.com/openfootball/worldcup.json/master/2026/worldcup.json';

// Nomes em inglês (conforme openfootball) → português (conforme world_cup_matches no BD)
const TEAM_MAP: Record<string, string> = {
  'Algeria': 'Argélia',
  'Argentina': 'Argentina',
  'Australia': 'Austrália',
  'Austria': 'Áustria',
  'Belgium': 'Bélgica',
  'Bosnia & Herzegovina': 'Bósnia-Herzegovina',
  'Brazil': 'Brasil',
  'Canada': 'Canadá',
  'Cape Verde': 'Cabo Verde',
  'Colombia': 'Colômbia',
  'Croatia': 'Croácia',
  'Curaçao': 'Curaçao',
  'Czech Republic': 'Rep. Tcheca',
  'DR Congo': 'RD Congo',
  'Ecuador': 'Equador',
  'Egypt': 'Egito',
  'England': 'Inglaterra',
  'France': 'França',
  'Germany': 'Alemanha',
  'Ghana': 'Gana',
  'Haiti': 'Haiti',
  'Iran': 'Irã',
  'Iraq': 'Iraque',
  'Ivory Coast': 'Costa do Marfim',
  'Japan': 'Japão',
  'Jordan': 'Jordânia',
  'Kosovo': 'Kosovo',
  'Mexico': 'México',
  'Morocco': 'Marrocos',
  'Netherlands': 'Holanda',
  'New Zealand': 'Nova Zelândia',
  'Norway': 'Noruega',
  'Panama': 'Panamá',
  'Paraguay': 'Paraguai',
  'Portugal': 'Portugal',
  'Qatar': 'Catar',
  'Saudi Arabia': 'Arábia Saudita',
  'Scotland': 'Escócia',
  'Senegal': 'Senegal',
  'South Africa': 'África do Sul',
  'South Korea': 'Coreia do Sul',
  'Spain': 'Espanha',
  'Sweden': 'Suécia',
  'Switzerland': 'Suíça',
  'Tunisia': 'Tunísia',
  'Turkey': 'Turquia',
  'Uruguay': 'Uruguai',
  'USA': 'Estados Unidos',
  'Uzbekistan': 'Uzbequistão',
};

export async function GET(req: Request) {
  const auth = req.headers.get('authorization')?.replace('Bearer ', '');
  if (auth !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );

  try {
    // 1. Jogos que já deveriam ter terminado (iniciados há 2h+) e ainda sem resultado
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

    // 2. Buscar dados do openfootball (CC0, sem autenticação)
    const apiRes = await fetch(OPENFOOTBALL_URL, { cache: 'no-store' });
    if (!apiRes.ok) {
      throw new Error(`openfootball fetch error: ${apiRes.status}`);
    }

    const apiData = await apiRes.json();
    const allMatches: Array<{
      team1: string;
      team2: string;
      score?: { ft: [number, number] };
    }> = apiData.matches ?? [];

    let updated = 0;
    let semScore = 0;
    let semCorrespondencia = 0;
    const errors: string[] = [];

    for (const match of pending) {
      // 3. Buscar no JSON pelo par de times (traduzindo inglês → português)
      const fixture = allMatches.find(m => {
        const home = TEAM_MAP[m.team1] ?? null;
        const away = TEAM_MAP[m.team2] ?? null;
        return home === match.home_team && away === match.away_team;
      });

      if (!fixture) {
        console.log(`[bolao-results] Sem correspondência: ${match.home_team} vs ${match.away_team}`);
        semCorrespondencia++;
        continue;
      }

      if (!fixture.score?.ft) {
        console.log(`[bolao-results] Sem placar ainda: ${match.home_team} vs ${match.away_team}`);
        semScore++;
        continue;
      }

      const [homeScore, awayScore] = fixture.score.ft;

      // 4. Atualizar placar no BD
      const { error: updateErr } = await supabase
        .from('world_cup_matches')
        .update({ home_score: homeScore, away_score: awayScore, status: 'finished' })
        .eq('id', match.id);

      if (updateErr) {
        errors.push(`Match ${match.id}: ${updateErr.message}`);
        continue;
      }

      // 5. Calcular pontos dos palpites desse jogo
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
      sem_score: semScore,
      sem_correspondencia: semCorrespondencia,
      errors: errors.length ? errors : undefined,
    });

  } catch (err) {
    console.error('[bolao-results] Erro:', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
