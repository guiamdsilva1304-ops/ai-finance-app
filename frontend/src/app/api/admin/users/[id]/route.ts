import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface TimelineEvent { icone: string; titulo: string; ts: string }

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = adminGuard(req);
  if (denied) return denied;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  try {
    const dias14 = new Date(Date.now() - 14 * 86_400_000).toISOString();
    const [profileRes, authRes, metasRes, txRes, msgs14Res, primeiraMsgRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id, nome, nome_preferido, phone, plan, last_login_at, created_at, pro_since, admin_notes, control_streak_days")
        .eq("user_id", params.id)
        .maybeSingle(),
      supabase.auth.admin.getUserById(params.id),
      supabase
        .from("metas")
        .select("id, nome, valor_alvo, valor_atual, prazo_meses, concluida, created_at")
        .eq("user_id", params.id)
        .order("created_at", { ascending: true })
        .limit(50),
      supabase
        .from("transactions")
        .select("id, descricao, valor, tipo, categoria, date, created_at")
        .eq("user_id", params.id)
        .order("created_at", { ascending: false })
        .limit(50),
      supabase
        .from("chat_history")
        .select("created_at")
        .eq("user_id", params.id)
        .eq("role", "user")
        .gte("created_at", dias14)
        .limit(2000),
      supabase
        .from("chat_history")
        .select("created_at")
        .eq("user_id", params.id)
        .eq("role", "user")
        .order("created_at", { ascending: true })
        .limit(1),
    ]);

    const profile = profileRes.data;
    if (!profile) return NextResponse.json({ error: "Usuário não encontrado" }, { status: 404 });

    const metas = metasRes.data ?? [];
    const txs = txRes.data ?? [];

    // Mensagens por dia (últimos 14 dias)
    const msgsPorDia: { dia: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86_400_000);
      msgsPorDia.push({ dia: d.toISOString().slice(0, 10), count: 0 });
    }
    const idx = new Map(msgsPorDia.map((m, i) => [m.dia, i]));
    for (const m of msgs14Res.data ?? []) {
      const dia = String(m.created_at).slice(0, 10);
      const i = idx.get(dia);
      if (i !== undefined) msgsPorDia[i].count++;
    }

    const timeline: TimelineEvent[] = [];
    if (profile.created_at) timeline.push({ icone: "🌱", titulo: "Cadastro", ts: profile.created_at });
    if (metas[0]) timeline.push({ icone: "🎯", titulo: `Primeira meta: ${metas[0].nome}`, ts: metas[0].created_at });
    const primeiraTx = [...txs].sort((a, b) => String(a.created_at).localeCompare(String(b.created_at)))[0];
    if (primeiraTx) timeline.push({ icone: "💳", titulo: "Primeira transação", ts: primeiraTx.created_at });
    if (primeiraMsgRes.data?.[0]) timeline.push({ icone: "💬", titulo: "Primeira mensagem no Assessor", ts: primeiraMsgRes.data[0].created_at });
    if (profile.pro_since) timeline.push({ icone: "⭐", titulo: "Upgrade para plano pago", ts: profile.pro_since });
    if (profile.last_login_at) timeline.push({ icone: "👋", titulo: "Último acesso", ts: profile.last_login_at });
    timeline.sort((a, b) => a.ts.localeCompare(b.ts));

    return NextResponse.json({
      profile: {
        user_id: profile.user_id,
        nome: profile.nome_preferido || profile.nome,
        email: authRes.error ? null : authRes.data.user?.email ?? null,
        phone: profile.phone,
        plan: profile.plan ?? "free",
        last_login_at: profile.last_login_at,
        created_at: profile.created_at,
        admin_notes: profile.admin_notes ?? "",
        streak: profile.control_streak_days ?? 0,
      },
      timeline,
      msgsPorDia,
      metas,
      ultimasTransacoes: txs.slice(0, 5),
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
