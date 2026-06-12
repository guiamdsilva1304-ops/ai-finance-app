import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export interface ShareMetrics {
  conquistas: number;       // metas concluídas (oportunidades de share)
  shares: number;           // shares efetivados (web_share + clipboard)
  cancelados: number;       // abriu o share mas desistiu
  taxaShare: number | null; // % de conquistas que viraram share
  porCanal: { web_share: number; clipboard: number; cancelado: number };
  ultimos: Array<{ created_at: string; canal: string | null }>;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  try {
    const [conquistasRes, eventosRes] = await Promise.all([
      supabase.from("metas").select("id", { count: "exact", head: true }).eq("concluida", true),
      supabase.from("share_events").select("canal,created_at").order("created_at", { ascending: false }).limit(500),
    ]);

    const conquistas = conquistasRes.count ?? 0;
    const eventos = eventosRes.data ?? [];

    const porCanal = { web_share: 0, clipboard: 0, cancelado: 0 };
    for (const e of eventos) {
      const c = (e.canal ?? "") as keyof typeof porCanal;
      if (c in porCanal) porCanal[c]++;
    }

    const shares = porCanal.web_share + porCanal.clipboard;
    const cancelados = porCanal.cancelado;
    const taxaShare = conquistas > 0 ? (shares / conquistas) * 100 : null;

    const metrics: ShareMetrics = {
      conquistas,
      shares,
      cancelados,
      taxaShare,
      porCanal,
      ultimos: eventos.slice(0, 10).map((e) => ({ created_at: e.created_at, canal: e.canal })),
    };

    return NextResponse.json(metrics);
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
