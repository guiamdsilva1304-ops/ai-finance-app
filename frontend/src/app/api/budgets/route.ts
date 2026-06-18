import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

async function getUser(req: NextRequest) {
  const token = req.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  const { data: { user } } = await supabase.auth.getUser(token);
  return user;
}

export async function GET(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const month = new URL(req.url).searchParams.get("month");
  if (!month) return NextResponse.json({ error: "Parâmetro month obrigatório" }, { status: 400 });

  const { data, error } = await supabase
    .from("budgets")
    .select("*")
    .eq("user_id", user.id)
    .eq("month", month)
    .order("category");

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  let body: { category?: unknown; limit_amount?: unknown; month?: unknown };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { category, limit_amount, month } = body;
  if (!category || !limit_amount || !month) {
    return NextResponse.json({ error: "category, limit_amount e month são obrigatórios" }, { status: 400 });
  }
  if (typeof limit_amount !== "number" || limit_amount <= 0) {
    return NextResponse.json({ error: "limit_amount deve ser um número positivo" }, { status: 400 });
  }

  const { data, error } = await supabase
    .from("budgets")
    .upsert(
      { user_id: user.id, category, limit_amount, month, updated_at: new Date().toISOString() },
      { onConflict: "user_id,category,month" }
    )
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(req: NextRequest) {
  const user = await getUser(req);
  if (!user) return NextResponse.json({ error: "Não autenticado" }, { status: 401 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Parâmetro id obrigatório" }, { status: 400 });

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
