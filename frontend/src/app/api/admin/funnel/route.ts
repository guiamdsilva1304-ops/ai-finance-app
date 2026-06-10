import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export interface FunnelStage {
  label: string;
  count: number;
  pctAnterior: number | null; // conversão vs etapa anterior
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  try {
    const [total, onboarding, metasUsers, txUsers, pagantes] = await Promise.all([
      supabase.from("user_profiles").select("id", { count: "exact", head: true }),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("onboarding_completo", true),
      // distinct em memória — base pequena; trocar por RPC quando passar de ~1000 usuários
      supabase.from("metas").select("user_id").limit(2000),
      supabase.from("transactions").select("user_id").limit(5000),
      supabase.from("user_profiles").select("id", { count: "exact", head: true }).neq("plan", "free"),
    ]);

    const distinct = (rows: { user_id: string }[] | null) =>
      new Set((rows ?? []).map(r => r.user_id)).size;

    const counts = [
      { label: "Cadastros", count: total.count ?? 0 },
      { label: "Onboarding", count: onboarding.count ?? 0 },
      { label: "1ª Meta", count: distinct(metasUsers.data) },
      { label: "1ª Transação", count: distinct(txUsers.data) },
      { label: "Pagante", count: pagantes.count ?? 0 },
    ];

    const stages: FunnelStage[] = counts.map((s, i) => ({
      ...s,
      pctAnterior: i === 0 ? null : counts[i - 1].count > 0 ? (s.count / counts[i - 1].count) * 100 : 0,
    }));

    return NextResponse.json({ stages });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
