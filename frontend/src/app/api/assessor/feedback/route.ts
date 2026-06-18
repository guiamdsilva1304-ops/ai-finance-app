import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization");
  const token = auth?.replace("Bearer ", "") ?? "";
  const { data: { user } } = await supabase.auth.getUser(token);
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { message?: unknown; response?: unknown; rating?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { message, response, rating } = body;
  if (typeof message !== "string" || typeof response !== "string" || typeof rating !== "boolean") {
    return NextResponse.json({ error: "Parâmetros inválidos" }, { status: 400 });
  }

  const { data: mem } = await supabase
    .from("user_memory")
    .select("*")
    .eq("user_id", user.id)
    .single();

  const { error } = await supabase.from("assessor_feedback").insert({
    user_id: user.id,
    message,
    response,
    rating,
    context: mem ?? {},
  });

  if (error) {
    console.error("[feedback] Erro ao salvar:", error);
    return NextResponse.json({ error: "Erro ao salvar feedback" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
