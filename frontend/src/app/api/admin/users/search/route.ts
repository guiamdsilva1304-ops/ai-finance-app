import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export interface AdminUserHit {
  user_id: string;
  nome: string | null;
  email: string | null;
  phone: string | null;
  plan: string;
  last_login_at: string | null;
  streak: number;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  const q = (req.nextUrl.searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ users: [] });

  try {
    // Busca por nome/telefone direto no perfil; email vive em auth.users,
    // então listamos via admin API e filtramos em memória (base pequena —
    // <100 usuários; revisar quando passar de ~1000).
    const [profilesRes, authRes] = await Promise.all([
      supabase
        .from("user_profiles")
        .select("user_id, nome, nome_preferido, phone, plan, last_login_at, control_streak_days")
        .or(`nome.ilike.%${q}%,nome_preferido.ilike.%${q}%,phone.ilike.%${q}%`)
        .limit(50),
      supabase.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    ]);

    if (profilesRes.error) {
      return NextResponse.json({ error: profilesRes.error.message }, { status: 500 });
    }

    const authUsers = authRes.error ? [] : authRes.data.users;
    const emailById = new Map(authUsers.map(u => [u.id, u.email ?? null]));

    const hits = new Map<string, AdminUserHit>();
    for (const p of profilesRes.data ?? []) {
      hits.set(p.user_id, {
        user_id: p.user_id,
        nome: p.nome_preferido || p.nome,
        email: emailById.get(p.user_id) ?? null,
        phone: p.phone,
        plan: p.plan ?? "free",
        last_login_at: p.last_login_at,
        streak: p.control_streak_days ?? 0,
      });
    }

    // Match por email
    const emailMatches = authUsers.filter(u => u.email?.toLowerCase().includes(q.toLowerCase()));
    if (emailMatches.length > 0) {
      const missing = emailMatches.filter(u => !hits.has(u.id)).map(u => u.id);
      const { data: extraProfiles } = missing.length
        ? await supabase
            .from("user_profiles")
            .select("user_id, nome, nome_preferido, phone, plan, last_login_at, control_streak_days")
            .in("user_id", missing)
            .limit(50)
        : { data: [] as never[] };
      const profileById = new Map((extraProfiles ?? []).map(p => [p.user_id, p]));
      for (const u of emailMatches) {
        if (hits.has(u.id)) continue;
        const p = profileById.get(u.id);
        hits.set(u.id, {
          user_id: u.id,
          nome: p?.nome_preferido || p?.nome || null,
          email: u.email ?? null,
          phone: p?.phone ?? null,
          plan: p?.plan ?? "free",
          last_login_at: p?.last_login_at ?? null,
          streak: p?.control_streak_days ?? 0,
        });
      }
    }

    return NextResponse.json({ users: Array.from(hits.values()).slice(0, 10) });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
