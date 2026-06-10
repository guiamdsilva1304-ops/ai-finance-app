import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export interface RadarUser {
  user_id: string;
  nome: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  last_login_at: string | null;
  streak: number;
  totalMsgs: number;
  temMeta: boolean;
  temTransacao7d: boolean;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  const page = Math.max(1, parseInt(req.nextUrl.searchParams.get("page") ?? "1", 10));
  const PAGE_SIZE = 50;
  const from = (page - 1) * PAGE_SIZE;

  try {
    const dias7 = new Date(Date.now() - 7 * 86_400_000).toISOString();
    const [profilesRes, authRes, msgsRes, metasRes, txRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id, nome, nome_preferido, phone, plan, last_login_at, control_streak_days", { count: "exact" })
        .order("last_login_at", { ascending: false, nullsFirst: false })
        .range(from, from + PAGE_SIZE - 1),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      // agregados em memória — base pequena (<100 usuários); trocar por RPC ao escalar
      supabase.from("chat_history").select("user_id").eq("role", "user").limit(5000),
      supabase.from("metas").select("user_id").limit(2000),
      supabase.from("transactions").select("user_id").gte("created_at", dias7).limit(5000),
    ]);

    if (profilesRes.error) {
      return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
    }

    const emailById = new Map(
      (authRes.error ? [] : authRes.data.users).map(u => [u.id, u.email ?? null])
    );
    const msgsCount = new Map<string, number>();
    for (const m of msgsRes.data ?? []) msgsCount.set(m.user_id, (msgsCount.get(m.user_id) ?? 0) + 1);
    const comMeta = new Set((metasRes.data ?? []).map(m => m.user_id));
    const comTx7d = new Set((txRes.data ?? []).map(t => t.user_id));

    const users: RadarUser[] = (profilesRes.data ?? []).map(p => ({
      user_id: p.user_id,
      nome: p.nome_preferido || p.nome,
      email: emailById.get(p.user_id) ?? null,
      phone: p.phone,
      plan: p.plan ?? "free",
      last_login_at: p.last_login_at,
      streak: p.control_streak_days ?? 0,
      totalMsgs: msgsCount.get(p.user_id) ?? 0,
      temMeta: comMeta.has(p.user_id),
      temTransacao7d: comTx7d.has(p.user_id),
    }));

    return NextResponse.json({ users, total: profilesRes.count ?? users.length, page });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
