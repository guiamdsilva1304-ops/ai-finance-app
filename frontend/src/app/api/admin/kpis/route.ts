import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const PRECO_PRO = 14.9;
const PRECO_PREMIUM = 39.9;

export interface Kpis {
  mrr: number;
  mrrDelta: number | null;
  pagantes: number;
  pagantesDelta: number | null;
  totalUsuarios: number;
  trialPaid: number;
  dau: number;
  mau: number;
  dauMau: number;
  churn30d: number;
  msgsPorUser: number;
  msgsPorUserDelta: number | null;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  const agora = Date.now();
  const iso = (msAtras: number) => new Date(agora - msAtras).toISOString();
  const DIA = 86_400_000;
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  try {
    const [total, pro, premium, proAte7d, premiumAte7d, dauRes, mauRes, comLogin, inativos30, msgs7, msgs14] =
      await Promise.all([
        supabase.from("user_profiles").select("id", { count: "exact", head: true }),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("plan", "pro"),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("plan", "premium"),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("plan", "pro").lte("pro_since", iso(7 * DIA)),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).eq("plan", "premium").lte("pro_since", iso(7 * DIA)),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("last_login_at", hoje.toISOString()),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).gte("last_login_at", iso(30 * DIA)),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).not("last_login_at", "is", null),
        supabase.from("user_profiles").select("id", { count: "exact", head: true }).lt("last_login_at", iso(30 * DIA)),
        supabase.from("chat_history").select("user_id").eq("role", "user").gte("created_at", iso(7 * DIA)).limit(5000),
        supabase.from("chat_history").select("user_id").eq("role", "user").gte("created_at", iso(14 * DIA)).lt("created_at", iso(7 * DIA)).limit(5000),
      ]);

    const nTotal = total.count ?? 0;
    const nPro = pro.count ?? 0;
    const nPremium = premium.count ?? 0;
    const pagantes = nPro + nPremium;
    const mrr = nPro * PRECO_PRO + nPremium * PRECO_PREMIUM;
    // MRR de 7 dias atrás, derivado de pro_since (única data de upgrade disponível)
    const mrrSemanaPassada = (proAte7d.count ?? 0) * PRECO_PRO + (premiumAte7d.count ?? 0) * PRECO_PREMIUM;

    const mediaMsgs = (rows: { user_id: string }[] | null) => {
      const list = rows ?? [];
      const users = new Set(list.map(r => r.user_id)).size;
      return users > 0 ? list.length / users : 0;
    };
    const msgsAtual = mediaMsgs(msgs7.data);
    const msgsAnterior = mediaMsgs(msgs14.data);

    const dau = dauRes.count ?? 0;
    const mau = mauRes.count ?? 0;
    const nComLogin = comLogin.count ?? 0;

    const kpis: Kpis = {
      mrr,
      mrrDelta: mrr - mrrSemanaPassada,
      pagantes,
      pagantesDelta: pagantes - ((proAte7d.count ?? 0) + (premiumAte7d.count ?? 0)),
      totalUsuarios: nTotal,
      trialPaid: nTotal > 0 ? (pagantes / nTotal) * 100 : 0,
      dau,
      mau,
      dauMau: mau > 0 ? (dau / mau) * 100 : 0,
      // proxy: % de quem já logou cujo último acesso passou de 30 dias
      churn30d: nComLogin > 0 ? ((inativos30.count ?? 0) / nComLogin) * 100 : 0,
      msgsPorUser: msgsAtual,
      msgsPorUserDelta: msgsAnterior > 0 || msgsAtual > 0 ? msgsAtual - msgsAnterior : null,
    };

    return NextResponse.json(kpis);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
