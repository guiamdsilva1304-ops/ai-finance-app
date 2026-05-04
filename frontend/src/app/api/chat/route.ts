import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const LIMITE_FREE = 10 // mensagens por dia
const LIMITE_PRO = 999 // ilimitado na prática

async function verificarLimite(userId: string): Promise<{ permitido: boolean; usadas: number; limite: number; plano: string }> {
  // Busca plano do usuário
  const { data: perfil } = await supabase
    .from('user_profiles')
    .select('plan')
    .eq('id', userId)
    .single()

  const plano = perfil?.plan ?? 'free'
  const limite = plano === 'pro' ? LIMITE_PRO : LIMITE_FREE

  if (plano === 'pro') return { permitido: true, usadas: 0, limite, plano }

  // Conta mensagens do usuário hoje
  const hoje = new Date()
  hoje.setHours(0, 0, 0, 0)

  const { count } = await supabase
    .from('chat_history')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('role', 'user')
    .gte('created_at', hoje.toISOString())

  const usadas = count ?? 0
  return { permitido: usadas < limite, usadas, limite, plano }
}

export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "") ?? "";

    // Verifica usuário via Supabase
    const { data: { user } } = await supabase.auth.getUser(token)
    if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 })

    // Verifica limite
    const { permitido, usadas, limite, plano } = await verificarLimite(user.id)
    if (!permitido) {
      return NextResponse.json({
        error: `Limite diário atingido`,
        limite_atingido: true,
        usadas,
        limite,
        plano,
        mensagem: `Você usou ${usadas} de ${limite} mensagens gratuitas hoje. Assine o Pro para ter acesso ilimitado ao Assessor IA.`,
      }, { status: 429 })
    }

    const body = await req.json();
    const { messages, context } = body;

    const systemPrompt = `Você é o assessor financeiro do iMoney. Fale como um amigo que entende muito de finanças — direto, humano, sem enrolação.

DADOS DO USUÁRIO:
- Idade: ${context?.idade ?? "não informada"}
- Ocupação: ${context?.ocupacao ?? "não informada"}
- Cidade: ${context?.cidade ?? ""}/${context?.estado ?? ""}
- Renda mensal: R$ ${Number(context?.renda ?? 0).toFixed(2)}
- Gastos mensais: R$ ${Number(context?.gastos ?? 0).toFixed(2)}
- Sobra mensal: R$ ${Number(context?.sobra ?? 0).toFixed(2)}
- Gastos por categoria: ${JSON.stringify(context?.gastosCat ?? {})}
- Metas: ${JSON.stringify(context?.metas ?? [])}
- Plano: ${plano === 'pro' ? 'Pro ✨' : 'Gratuito'}

ECONOMIA:
- SELIC: ${context?.selic ?? 14.75}% a.a.
- IPCA anual: ${context?.ipca_anual ?? 5.48}%

COMO RESPONDER:
- Escreva em parágrafos curtos, como numa conversa de WhatsApp com um amigo culto
- Seja direto: dê a resposta logo, sem introduções longas
- Use números concretos quando ajudar (ex: "guarda R$ 300 por mês")
- Evite listas com bullet points — prefira texto corrido
- Para perguntas práticas use este formato quando ajudar: 📊 situação resumida | ✅ o que fazer agora | 💡 dica extra com dado real
- Seja conciso sem ser raso — use quantas palavras o tema precisar, mas nunca enrole
- Só use listas quando tiver 4+ itens que realmente precisam ser enumerados
- NUNCA use tabelas markdown
- Use no máximo 1 emoji por resposta, só se fizer sentido natural
- Não use negrito excessivo — só para destacar um número ou termo técnico importante
- Máximo 250 palavras por resposta
- Se não souber algo do usuário, pergunte de forma simples antes de responder`

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: systemPrompt,
      messages: messages.map((m: { role: string; content: string }) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    const reply = response.content[0].type === "text" ? response.content[0].text : "";

    // Salva no histórico
    const ultimaMensagem = messages[messages.length - 1]
    if (ultimaMensagem?.role === 'user') {
      await supabase.from('chat_history').insert([
        { user_id: user.id, role: 'user', content: ultimaMensagem.content, created_at: new Date().toISOString() },
        { user_id: user.id, role: 'assistant', content: reply, created_at: new Date().toISOString() },
      ])
    }

    return NextResponse.json({
      reply,
      usadas: usadas + 1,
      limite,
      plano,
    })
  } catch (err: unknown) {
    console.error("Chat error:", err);
    const msg = err instanceof Error ? err.message : "Erro interno";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
