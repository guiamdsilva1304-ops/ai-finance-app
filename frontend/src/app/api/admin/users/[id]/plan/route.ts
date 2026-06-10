import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PLANOS = ["free", "pro", "premium"] as const;

// Mudança manual de plano (cortesia). NÃO mexe no gateway de pagamento —
// é deliberado: serve para conceder/remover acesso sem cobrança.
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = adminGuard(req);
  if (denied) return denied;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { plan?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  const plan = body.plan;
  if (typeof plan !== "string" || !PLANOS.includes(plan as (typeof PLANOS)[number])) {
    return NextResponse.json({ error: "plan deve ser free | pro | premium" }, { status: 400 });
  }

  const { data: atual } = await supabase
    .from("user_profiles")
    .select("pro_since")
    .eq("user_id", params.id)
    .maybeSingle();

  const updates: Record<string, unknown> = {
    plan,
    is_pro: plan !== "free",
    updated_at: new Date().toISOString(),
  };
  // não sobrescreve a data original de upgrade (usada no delta de MRR)
  if (plan !== "free" && !atual?.pro_since) updates.pro_since = new Date().toISOString();

  const { error } = await supabase.from("user_profiles").update(updates).eq("user_id", params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, plan });
}
