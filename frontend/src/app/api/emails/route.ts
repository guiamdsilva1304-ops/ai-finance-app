import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FROM_EMAIL = "iMoney <onboarding@resend.dev>";
const RESEND_KEY = process.env.RESEND_API_KEY!;

async function sendEmail(to: string, subject: string, html: string) {
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({ from: FROM_EMAIL, to, subject, html }),
  });
  return res.json();
}

function welcomeEmail(email: string) {
  return {
    subject: "Bem-vindo ao iMoney 🧭",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #14532d, #16a34a); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; font-size: 28px; font-weight: 900; margin: 0 0 8px;">Bem-vindo ao iMoney 🧭</h1>
          <p style="color: #86efac; font-size: 16px; margin: 0;">Sua bússola financeira pessoal com IA</p>
        </div>
        
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">Oi,</p>
          
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">Sou o Gui, fundador do iMoney.</p>
          
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
            Você acabou de dar o primeiro passo que 78% dos brasileiros nunca dão: decidiu entender melhor o próprio dinheiro.
          </p>
          
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">No iMoney você tem acesso a:</p>
          
          <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 20px 24px; border-radius: 0 8px 8px 0; margin: 24px 0;">
            <p style="margin: 0 0 8px; color: #0f172a; font-size: 15px;">✅ <strong>Assessor IA financeiro</strong> — converse sobre suas finanças como se fosse um consultor particular</p>
            <p style="margin: 0 0 8px; color: #0f172a; font-size: 15px;">✅ <strong>Controle de gastos e receitas</strong> — saiba exatamente onde seu dinheiro está indo</p>
            <p style="margin: 0; color: #0f172a; font-size: 15px;">✅ <strong>Metas financeiras</strong> — defina objetivos e acompanhe seu progresso</p>
          </div>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://ai-finance-app-ashen.vercel.app/dashboard" style="background: #16a34a; color: #fff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Acessar o iMoney →
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Se tiver qualquer dúvida ou sugestão, basta responder esse email. Leio todos pessoalmente.
          </p>
          
          <p style="color: #0f172a; font-size: 15px; margin-top: 32px;">
            Gui Moreira<br>
            <span style="color: #16a34a;">Fundador, iMoney</span>
          </p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">iMoney — Inteligência Financeira Pessoal</p>
        </div>
      </div>
    `
  };
}

function proConversionEmail() {
  return {
    subject: "Uma coisa que percebi sobre você no iMoney",
    html: `
      <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: linear-gradient(135deg, #14532d, #16a34a); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
          <h1 style="color: #fff; font-size: 24px; font-weight: 900; margin: 0;">iMoney Pro 🚀</h1>
        </div>
        
        <div style="padding: 40px 32px;">
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">Oi,</p>
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">Sou o Gui, fundador do iMoney.</p>
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
            Você criou sua conta e quero te agradecer por isso. Cada usuário importa — especialmente agora, no início.
          </p>
          <p style="color: #0f172a; font-size: 16px; line-height: 1.6;">
            Queria te contar uma coisa: o iMoney Pro existe porque percebi que controle financeiro de verdade precisa de mais do que um app básico. 
            Precisa de uma IA que realmente entende o seu contexto, te alerta antes de você estourar o orçamento, e te mostra onde seu dinheiro está indo.
          </p>
          
          <div style="background: #f0fdf4; border-radius: 12px; padding: 24px; margin: 24px 0;">
            <p style="color: #14532d; font-weight: 700; font-size: 15px; margin: 0 0 12px;">É isso que o Pro oferece:</p>
            <p style="margin: 0 0 8px; color: #0f172a; font-size: 15px;">→ Assessor IA sem limite de mensagens</p>
            <p style="margin: 0 0 8px; color: #0f172a; font-size: 15px;">→ Relatórios que mostram seus padrões de gasto</p>
            <p style="margin: 0; color: #0f172a; font-size: 15px;">→ Alertas inteligentes antes que seja tarde</p>
          </div>
          
          <p style="color: #0f172a; font-size: 16px; font-weight: 700;">R$29/mês. Menos que um jantar fora.</p>
          
          <div style="text-align: center; margin: 32px 0;">
            <a href="https://ai-finance-app-ashen.vercel.app/dashboard/pro" style="background: #16a34a; color: #fff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
              Conhecer o iMoney Pro →
            </a>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.6;">
            Se tiver qualquer dúvida ou sugestão, me responde aqui. Leio todos os emails.
          </p>
          
          <p style="color: #0f172a; font-size: 15px; margin-top: 32px;">
            Gui<br>
            <span style="color: #16a34a;">iMoney</span>
          </p>
        </div>
      </div>
    `
  };
}

// POST — envia email para tipo especifico
// GET — envia campanha Pro para todos os usuarios
export async function POST(req: NextRequest) {
  try {
    const { type, to } = await req.json();
    
    let emailData;
    if (type === "welcome") emailData = welcomeEmail(to);
    else if (type === "pro") emailData = proConversionEmail();
    else return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    
    const result = await sendEmail(to, emailData.subject, emailData.html);
    return NextResponse.json({ success: true, result });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "pro";
    
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    
    // Busca todos os usuarios
    const { data: users } = await supabase.auth.admin.listUsers();
    const emails = users?.users?.map(u => u.email).filter(Boolean) || [];
    
    const results = [];
    for (const email of emails) {
      if (!email) continue;
      let emailData;
      if (type === "welcome") emailData = welcomeEmail(email);
      else emailData = proConversionEmail();
      
      const result = await sendEmail(email, emailData.subject, emailData.html);
      results.push({ email, result });
      // Delay para nao sobrecarregar o Resend
      await new Promise(r => setTimeout(r, 300));
    }
    
    return NextResponse.json({ success: true, sent: results.length, results });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
