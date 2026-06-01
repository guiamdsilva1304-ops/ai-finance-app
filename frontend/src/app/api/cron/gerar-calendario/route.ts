import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { createClient } from '@supabase/supabase-js';

export const maxDuration = 300;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function getWeekDates() {
  const now = new Date();
  const day = now.getDay();
  const monday = new Date(now);
  monday.setDate(now.getDate() - ((day + 6) % 7) + 7);
  const days = ['Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return days.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + 1 + i);
    return { name, date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) };
  });
}

function cleanJSON(raw: string): string {
  // Remove markdown code blocks
  let clean = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();
  // Extract first valid JSON object
  const start = clean.indexOf('{');
  const end = clean.lastIndexOf('}');
  if (start !== -1 && end !== -1) clean = clean.slice(start, end + 1);
  return clean;
}

export async function GET(request: Request) {
  const authHeader = request.headers.get('authorization');
  const cronSecret = process.env.CRON_SECRET || process.env.imoneycronsecret2026;
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dates = getWeekDates();
    const weekLabel = `${dates[0].date} a ${dates[5].date}`;

    console.log('[gerar-calendario] Buscando tendências...');

    // Passo 1: busca tendências
    const searchMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      tools: [{ type: 'web_search_20250305', name: 'web_search' } as any],
      tool_choice: { type: 'any' },
      system: 'Você é um analista de tendências de finanças pessoais no Brasil. Faça UMA busca e retorne os 5 principais tópicos em alta. Responda em texto simples, sem JSON.',
      messages: [{
        role: 'user',
        content: `Busque "finanças pessoais tendências Brasil ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}" e liste os 5 principais assuntos em alta.`,
      }],
    });

    const trendText = searchMsg.content
      .filter((b) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');

    console.log('[gerar-calendario] Gerando calendário...');

    // Passo 2: gera calendário com base nas tendências
    const calMsg = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      system: `Você é o agente de conteúdo da iMoney, plataforma brasileira de finanças pessoais com IA.

MARCA: "Seus sonhos têm um plano. A iMoney cuida dele." | Persona: Marina, 26 anos, SP | Voz: aspiracional, próxima.
Pilares SEPC: Sonho 30%, Educação 35%, Produto 20%, Conquista 15%.

REGRAS CRÍTICAS DE JSON:
1. Retorne APENAS JSON válido, sem markdown, sem texto fora do JSON
2. NUNCA use aspas duplas dentro de strings — use aspas simples ou reescreva sem aspas
3. NUNCA use quebras de linha dentro de strings JSON — use \\n se necessário
4. Mantenha os textos curtos e objetivos`,
      messages: [{
        role: 'user',
        content: `Tendências da semana:
${trendText}

Gere o calendário para a semana ${weekLabel} com este formato EXATO (6 objetos no array dias):

{
  "semana": "${weekLabel}",
  "dias": [
    {
      "dia": "Terça",
      "data": "${dates[0].date}",
      "formato": "Carrossel Instagram",
      "pilar": "Educação",
      "tema": "titulo aqui",
      "angulo": "angulo aqui",
      "copy_caption": "legenda aqui sem aspas duplas",
      "conteudo": ["slide 1", "slide 2", "slide 3", "slide 4", "slide 5"],
      "prompt_visual": "prompt aqui",
      "hashtags": ["#tag1", "#tag2", "#tag3", "#tag4", "#tag5"]
    }
  ]
}

Dias a incluir:
- Terça ${dates[0].date}: Carrossel Instagram, pilar Educação
- Quarta ${dates[1].date}: TikTok/Reels, pilar Sonho
- Quinta ${dates[2].date}: Carrossel Instagram, pilar Produto
- Sexta ${dates[3].date}: TikTok/Reels, pilar Educação
- Sábado ${dates[4].date}: TikTok/Reels, pilar Conquista
- Domingo ${dates[5].date}: TikTok/Reels, pilar Sonho`,
      }],
    });

    const rawText = calMsg.content
      .filter((b) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');

    let calendarData;
    try {
      calendarData = JSON.parse(cleanJSON(rawText));
    } catch (e) {
      console.error('[gerar-calendario] JSON inválido:', rawText.slice(0, 500));
      throw new Error(`JSON inválido: ${e instanceof Error ? e.message : String(e)}`);
    }

    // Salva no Supabase
    const { error } = await supabase
      .from('content_pipeline')
      .upsert(
        {
          type: 'calendario_semanal',
          week: weekLabel,
          content: calendarData,
          status: 'pending',
          created_at: new Date().toISOString(),
        },
        { onConflict: 'type,week' }
      );

    if (error) throw error;

    console.log('[gerar-calendario] Calendário salvo para semana', weekLabel);

    return NextResponse.json({
      ok: true,
      week: weekLabel,
      days: calendarData.dias?.length ?? 0,
    });
  } catch (error) {
    console.error('[gerar-calendario] Erro:', error);
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    }, { status: 500 });
  }
}
