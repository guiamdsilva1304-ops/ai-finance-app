import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const FROM_EMAIL = "Gui da iMoney <gui@imoney.ia.br>";
const RESEND_KEY = process.env.RESEND_API_KEY ?? 're_placeholder';

// Rate limiting: máx 3 tentativas por email por hora (por instância serverless)
const rateLimitMap = new Map<string, number[]>();

function isRateLimited(email: string): boolean {
  const now = Date.now();
  const windowMs = 60 * 60 * 1000; // 1 hora
  const prev = (rateLimitMap.get(email) || []).filter(t => now - t < windowMs);
  if (prev.length >= 3) return true;
  rateLimitMap.set(email, [...prev, now]);
  return false;
}

function resetPasswordEmail(link: string) {
  return `
    <div style="font-family: 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
      <div style="background: linear-gradient(135deg, #14532d, #16a34a); padding: 40px 32px; text-align: center; border-radius: 12px 12px 0 0;">
        <h1 style="color: #fff; font-size: 24px; font-weight: 900; margin: 0 0 8px;">Redefinir sua senha</h1>
        <p style="color: #86efac; font-size: 15px; margin: 0;">iMoney — Inteligência Financeira Pessoal</p>
      </div>

      <div style="padding: 40px 32px;">
        <p style="color: #0f172a; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">Oi,</p>
        <p style="color: #0f172a; font-size: 16px; line-height: 1.6; margin: 0 0 16px;">
          Recebemos uma solicitação para redefinir a senha da sua conta no iMoney.
        </p>
        <p style="color: #0f172a; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
          Clique no botão abaixo para criar uma nova senha. O link é válido por <strong>1 hora</strong>.
        </p>

        <div style="text-align: center; margin: 32px 0;">
          <a href="${link}" style="background: #16a34a; color: #fff; padding: 16px 40px; border-radius: 10px; text-decoration: none; font-weight: 700; font-size: 16px; display: inline-block;">
            Redefinir minha senha →
          </a>
        </div>

        <div style="background: #fef9c3; border: 1px solid #fde047; border-radius: 10px; padding: 16px 20px; margin: 24px 0;">
          <p style="color: #713f12; font-size: 13px; margin: 0; line-height: 1.6;">
            ⚠️ Se você não solicitou a redefinição de senha, ignore este email. Sua senha permanece a mesma e nenhuma alteração foi feita.
          </p>
        </div>

        <p style="color: #64748b; font-size: 13px; line-height: 1.6; margin: 24px 0 0;">
          Se o botão não funcionar, copie e cole este link no navegador:<br/>
          <span style="color: #16a34a; word-break: break-all;">${link}</span>
        </p>

        <p style="color: #0f172a; font-size: 15px; margin-top: 32px;">
          Gui Moreira<br/>
          <span style="color: #16a34a;">Fundador, iMoney</span>
        </p>
      </div>

      <div style="background: #f8fafc; padding: 20px 32px; text-align: center; border-radius: 0 0 12px 12px; border-top: 1px solid #e2e8f0;">
        <p style="color: #94a3b8; font-size: 12px; margin: 0;">iMoney — Inteligência Financeira Pessoal</p>
      </div>
    </div>
  `;
}

export async function POST(req: NextRequest) {
  let email: string;
  try {
    ({ email } = await req.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  if (!email || typeof email !== "string" || !email.includes("@")) {
    return NextResponse.json({ error: "Email inválido." }, { status: 400 });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (isRateLimited(normalizedEmail)) {
    return NextResponse.json(
      { error: "Muitas tentativas. Aguarde 1 hora antes de tentar novamente." },
      { status: 429 }
    );
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
  );

  const origin = new URL(req.url).origin;

  const { data, error } = await supabase.auth.admin.generateLink({
    type: "recovery",
    email: normalizedEmail,
    options: {
      redirectTo: `${origin}/auth/callback?type=recovery`,
    },
  });

  // Retorna sucesso mesmo se email não existir (não revela quais emails estão cadastrados)
  if (error || !data?.properties?.action_link) {
    return NextResponse.json({ success: true });
  }

  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_KEY}`,
    },
    body: JSON.stringify({
      from: FROM_EMAIL,
      to: normalizedEmail,
      subject: "Redefinir sua senha — iMoney",
      html: resetPasswordEmail(data.properties.action_link),
    }),
  });

  return NextResponse.json({ success: true });
}
