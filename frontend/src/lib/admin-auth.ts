import { NextRequest, NextResponse } from "next/server";

// Guard padrão dos endpoints /api/admin/* — mesmo esquema do restante do
// admin: header x-admin-key (fetch do client) OU cookie httpOnly da sessão.
// O middleware não cobre /api/*, então toda rota admin precisa chamar isto.
export function adminGuard(req: NextRequest): NextResponse | null {
  const SECRET = process.env.ADMIN_SESSION_SECRET;
  if (!SECRET) {
    // Fail-closed: sem o segredo configurado, nenhum acesso admin é permitido.
    console.error("[adminGuard] ADMIN_SESSION_SECRET não configurado — acesso negado");
    return NextResponse.json({ error: "Configuração de servidor inválida" }, { status: 500 });
  }
  const header = req.headers.get("x-admin-key");
  const cookie = req.cookies.get("imoney_admin_session")?.value;
  if (header !== SECRET && cookie !== SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return null;
}
