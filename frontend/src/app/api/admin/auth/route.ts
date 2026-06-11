import { NextRequest, NextResponse } from "next/server";

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_SECRET = process.env.ADMIN_SESSION_SECRET;
const ADMIN_COOKIE = "imoney_admin_session";

export async function POST(req: NextRequest) {
  const { password } = await req.json();
  // Fail-closed: sem segredos configurados no servidor, não há login possível.
  if (!ADMIN_PASSWORD || !SESSION_SECRET) {
    console.error("[admin/auth] ADMIN_PASSWORD ou ADMIN_SESSION_SECRET não configurado");
    return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
  }
  if (password !== ADMIN_PASSWORD) {
    return NextResponse.json({ error: "Senha incorreta" }, { status: 401 });
  }
  // Retorna o sessionKey para o frontend salvar no localStorage (usado no header x-admin-key)
  const res = NextResponse.json({ ok: true, sessionKey: SESSION_SECRET });
  res.cookies.set(ADMIN_COOKIE, SESSION_SECRET, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
  return res;
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.delete("imoney_admin_session");
  return res;
}
