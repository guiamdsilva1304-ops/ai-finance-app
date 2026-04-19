export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function GET(req: Request) {
  try {
    const auth = req.headers.get("authorization");
    const token = auth?.replace("Bearer ", "");
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { global: { headers: { Authorization: `Bearer ${token}` } } }
    );

    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().split("T")[0];

    const { data: transactions, error: txError } = await supabase
      .from("transactions")
      .select("valor, tipo, categoria")
      .eq("user_id", user.id)
      .gte("date", firstDay)
      .lte("date", lastDay);

    if (txError) {
      console.error("TX error:", txError);
      return NextResponse.json({ error: txError.message }, { status: 500 });
    }

    const gastos = (transactions ?? [])
      .filter(t => t.tipo === "gasto")
      .reduce((s, t) => s + Number(t.valor), 0);

    const renda = (transactions ?? [])
      .filter(t => t.tipo === "receita")
      .reduce((s, t) => s + Number(t.valor), 0);

    const gastosCat: Record<string, number> = {};
    (transactions ?? [])
      .filter(t => t.tipo === "gasto")
      .forEach(t => {
        gastosCat[t.categoria] = (gastosCat[t.categoria] ?? 0) + Number(t.valor);
      });

    return NextResponse.json({ renda, gastos, sobra: renda - gastos, gastosCat });
  } catch (err) {
    console.error("Summary error:", err);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}
