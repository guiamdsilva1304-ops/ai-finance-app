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
  monday.setDate(now.getDate() - ((day + 6) % 7) + 7); // próxima segunda

  const days = ['Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  return days.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + 1 + i);
    return {
      name,
      date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }),
    };
  });
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

    console.log('[gerar-calendario] Buscando tendências e gerando calendário...');

    // Uma única chamada com web_search — o modelo faz 1 busca e já gera tudo
    const message = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4096,
      tools: [
        {
          type: 'web_search_20250305',
          name: 'web_search',
        } as any,
      ],
      tool_choice: { type: 'auto' },
      system: `Você é o agente de conteúdo da iMoney, plataforma brasileira de finanças pessoais com IA.

MARCA:
- Posicionamento: "Seus sonhos têm um plano. A iMoney cuida dele."
- Eixo: Sonho → Plano → Conquista
- Persona: Marina, 26 anos, analista de marketing em SP
- Voz: aspiracional, próxima, nunca fria ou bancária
- Pilares SEPC: Sonho 30%, Educação 35%, Produto 20%, Conquista 15%

FORMATOS:
- Carrossel Instagram: 6-8 slides objetivos, fundo branco, ícones clay 3D
- TikTok/Reels (30-60s): Hook → Problema → Pivot → CTA

REGRA CRÍTICA: Faça APENAS UMA busca para encontrar os trending topics de finanças pessoais no Brasil esta semana. Depois gere o calendário completo em uma única resposta com JSON válido. Sem markdown, sem texto fora do JSON.`,
      messages: [{
        role: 'user',
        content: `Faça UMA busca por "finanças pessoais tendências Brasil ${new Date().toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}" para encontrar os assuntos mais relevantes da semana.

Com base nos resultados, gere o calendário editorial para a semana ${weekLabel}:

- Terça ${dates[0].date}: Carrossel Instagram — pilar Educação
- Quarta ${dates[1].date}: TikTok/Reels — pilar Sonho
- Quinta ${dates[2].date}: Carrossel Instagram — pilar Produto
- Sexta ${dates[3].date}: TikTok/Reels — pilar Educação
- Sábado ${dates[4].date}: TikTok/Reels — pilar Conquista
- Domingo ${dates[5].date}: TikTok/Reels — pilar Sonho

Para cada dia retorne:
{
  "dia": "Terça",
  "data": "03/06",
  "formato": "Carrossel Instagram",
  "pilar": "Educação",
  "tema": "título criativo baseado nos trending topics",
  "angulo": "ângulo específico e atual",
  "copy_caption": "legenda completa com emojis e CTA (máx 150 palavras)",
  "conteudo": ["slide 1 ou linha do script", "slide 2..."],
  "prompt_visual": "prompt detalhado para gerar imagem de capa no Gemini",
  "hashtags": ["#hashtag1", "#hashtag2", "#hashtag3", "#hashtag4", "#hashtag5"]
}

Retorne APENAS: { "semana": "${weekLabel}", "dias": [...6 objetos...] }`,
      }],
    });

    // Extrai o texto final da resposta (último bloco de texto após tool use)
    const textBlock = message.content
      .filter((b) => b.type === 'text')
      .pop();
    const raw = textBlock?.type === 'text' ? textBlock.text : '';

    let calendarData;
    try {
      calendarData = JSON.parse(raw);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) calendarData = JSON.parse(match[0]);
      else throw new Error('Falha ao parsear JSON do calendário');
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

    console.log('[gerar-calendario] Calendário salvo no Supabase para semana', weekLabel);

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
