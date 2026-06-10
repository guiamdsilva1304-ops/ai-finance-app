import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export interface ActivityEvent {
  id: string;
  icone: string;
  tipo: "transacao" | "meta" | "cadastro" | "upgrade" | "mensagem";
  user_id: string | null;
  nome: string;
  descricao: string;
  ts: string;
}

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  try {
    const [txRes, metasRes, cadastrosRes, upgradesRes, msgsRes] = await Promise.all([
      supabase.from("transactions").select("id, user_id, descricao, valor, tipo, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("metas").select("id, user_id, nome, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("user_profiles").select("user_id, created_at").order("created_at", { ascending: false }).limit(20),
      supabase.from("user_profiles").select("user_id, plan, pro_since").not("pro_since", "is", null).order("pro_since", { ascending: false }).limit(20),
      supabase.from("chat_history").select("id, user_id, created_at").eq("role", "user").order("created_at", { ascending: false }).limit(20),
    ]);

    const eventos: ActivityEvent[] = [];

    for (const t of txRes.data ?? []) {
      const valor = Number(t.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 });
      eventos.push({
        id: `tx-${t.id}`, icone: "💳", tipo: "transacao", user_id: t.user_id, nome: "",
        descricao: `registrou ${t.tipo === "receita" ? "receita" : "gasto"}: ${t.descricao} (R$ ${valor})`,
        ts: t.created_at,
      });
    }
    for (const m of metasRes.data ?? []) {
      eventos.push({ id: `meta-${m.id}`, icone: "🎯", tipo: "meta", user_id: m.user_id, nome: "", descricao: `criou a meta "${m.nome}"`, ts: m.created_at });
    }
    for (const c of cadastrosRes.data ?? []) {
      if (c.created_at) eventos.push({ id: `cad-${c.user_id}`, icone: "🌱", tipo: "cadastro", user_id: c.user_id, nome: "", descricao: "entrou na iMoney", ts: c.created_at });
    }
    for (const u of upgradesRes.data ?? []) {
      if (u.pro_since) eventos.push({ id: `up-${u.user_id}`, icone: "⭐", tipo: "upgrade", user_id: u.user_id, nome: "", descricao: `virou ${u.plan ?? "pagante"}`, ts: u.pro_since });
    }
    for (const m of msgsRes.data ?? []) {
      eventos.push({ id: `msg-${m.id}`, icone: "💬", tipo: "mensagem", user_id: m.user_id, nome: "", descricao: "mandou mensagem no Assessor", ts: m.created_at });
    }

    eventos.sort((a, b) => b.ts.localeCompare(a.ts));
    const top = eventos.slice(0, 50);

    // Resolve nomes em uma query só
    const ids = Array.from(new Set(top.map(e => e.user_id).filter((v): v is string => !!v)));
    const { data: perfis } = ids.length
      ? await supabase.from("user_profiles").select("user_id, nome, nome_preferido").in("user_id", ids).limit(50)
      : { data: [] as { user_id: string; nome: string | null; nome_preferido: string | null }[] };
    const nomeById = new Map((perfis ?? []).map(p => [p.user_id, p.nome_preferido || p.nome]));
    for (const e of top) e.nome = (e.user_id && nomeById.get(e.user_id)) || "usuário anônimo";

    return NextResponse.json({ eventos: top });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
