import type { SupabaseClient } from "@supabase/supabase-js";

export async function getBudgetContext(supabase: SupabaseClient, userId: string): Promise<string> {
  try {
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;

    const { data: budgets } = await supabase
      .from("budgets")
      .select("category, limit_amount")
      .eq("user_id", userId)
      .eq("month", month);

    if (!budgets || budgets.length === 0) return "";

    const startDate = `${month}-01`;
    const nextMonthDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    const endDate = nextMonthDate.toISOString().split("T")[0];

    const { data: txs } = await supabase
      .from("transactions")
      .select("categoria, valor")
      .eq("user_id", userId)
      .eq("tipo", "gasto")
      .gte("date", startDate)
      .lt("date", endDate);

    const spent: Record<string, number> = {};
    for (const tx of txs ?? []) {
      spent[tx.categoria] = (spent[tx.categoria] ?? 0) + Math.abs(Number(tx.valor));
    }

    const lines = budgets.map(b => {
      const gastado = spent[b.category] ?? 0;
      const pct = b.limit_amount > 0 ? Math.round((gastado / b.limit_amount) * 100) : 0;
      const restante = Math.max(0, b.limit_amount - gastado);
      const status = pct >= 100 ? "🔴 TETO ATINGIDO" : pct >= 80 ? "🟡 ATENÇÃO" : "🟢 OK";
      return `  - ${b.category}: gasto R$${gastado.toFixed(2)} de R$${Number(b.limit_amount).toFixed(2)} (${pct}%) | restante R$${restante.toFixed(2)} | ${status}`;
    });

    return `\nORÇAMENTO DO MÊS (${month}):\n${lines.join("\n")}`;
  } catch {
    return "";
  }
}
