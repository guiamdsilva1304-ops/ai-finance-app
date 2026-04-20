import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { Resend } from "resend";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
const resend = new Resend(process.env.RESEND_API_KEY);

function buildPrompt(userName: string, userEmail: string, context: string) {
  return `Você é o melhor especialista em onboarding de fintechs brasileiras. Crie uma sequência completa de 7 e-mails de onboarding para a iMoney.

SOBRE A iMoney:
- App gratuito de finanças pessoais com IA para brasileiros
- Categoriza gastos automaticamente via Open Finance (Pluggy)
- Assessor financeiro por IA (powered by Claude)
- Metas financeiras inteligentes
- Interface branca e verde, fonte Nunito, identidade jovem e acessível
- URL do app: https://ai-finance-app-ashen.vercel.app

USUÁRIO:
- Nome: ${userName}
- Email: ${userEmail}
- Contexto adicional: ${context || "Novo usuário que acabou de se cadastrar"}

SEQUÊNCIA DE E-MAILS:
1. Imediato após cadastro — Boas-vindas calorosas + primeiro passo claro
2. Dia 1 — Cadastrar renda mensal (por que é importante)
3. Dia 2 — Adicionar principais gastos (categorias)
4. Dia 3 — Definir primeira meta financeira
5. Dia 5 — Conectar Open Finance para categorização automática
6. Dia 7 — Apresentar o Assessor IA e o que ele pode fazer
7. Dia 14 — Re-engajamento se não usou (abordagem empática)

RETORNE SOMENTE este JSON:
{
  "sequence": [
    {
      "day": 0,
      "subject": "assunto do email (max 50 chars, sem emoji no início)",
      "preview": "texto de preview (max 90 chars)",
      "html": "HTML completo do email com design bonito em verde e branco iMoney, responsivo, com botão CTA verde #00C853",
      "plain": "versão texto plano do email"
    }
  ]
}

REGRAS PARA OS E-MAILS:
1. Tom amigável, próximo, como um amigo inteligente — nunca corporativo
2. Assunto deve gerar curiosidade e ter alta taxa de abertura
3. Cada email deve ter UM único objetivo e UM único CTA
4. Use o nome ${userName} de forma natural
5. Máximo 150 palavras por email — seja direto
6. HTML deve ser bonito: fonte Nunito do Google Fonts, cor primária #00C853, fundo branco, botão verde arredondado
7. Inclua o logo "💸 iMoney" no topo de cada email
8. Rodapé com "Você recebe este email pois se cadastrou na iMoney" e link de descadastro
9. Dados reais do Brasil para contextualizar (ex: "70% dos brasileiros não têm reserva de emergência")
10. Cada email deve ser autossuficiente — funcionar mesmo se o usuário não leu os anteriores`;
}

export async function POST(req: NextRequest) {
  try {
    const { userName, userEmail, context, sendNow = false } = await req.json();
    if (!userName || !userEmail) throw new Error("Nome e email são obrigatórios");

    // Gerar sequência com Claude
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: "Responda SOMENTE com JSON válido. Sem markdown. Sem texto fora do JSON.",
      messages: [{ role: "user", content: buildPrompt(userName, userEmail, context) }],
    });

    const raw = message.content.filter((b) => b.type === "text").map((b: any) => b.text).join("").trim();
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) throw new Error("Resposta inválida do modelo");
    const parsed = JSON.parse(match[0]);

    // Enviar email 1 imediatamente se solicitado
    if (sendNow && parsed.sequence?.[0]) {
      const first = parsed.sequence[0];
      await resend.emails.send({
        from: "iMoney <onboarding@resend.dev>",
        to: userEmail,
        subject: first.subject,
        html: first.html,
        text: first.plain,
      });
    }

    return NextResponse.json({ ...parsed, sent: sendNow });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
