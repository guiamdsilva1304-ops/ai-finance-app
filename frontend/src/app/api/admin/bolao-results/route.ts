import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export async function POST(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  let body: { match_id: unknown; home_score: unknown; away_score: unknown; advanced_team?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { match_id, home_score, away_score, advanced_team } = body;

  if (
    typeof match_id !== "number" ||
    typeof home_score !== "number" ||
    typeof away_score !== "number" ||
    home_score < 0 ||
    away_score < 0
  ) {
    return NextResponse.json(
      { error: "match_id, home_score e away_score são obrigatórios e devem ser números ≥ 0" },
      { status: 400 }
    );
  }

  // advanced_team deve ser string não-vazia ou ausente
  const advancedTeam =
    typeof advanced_team === "string" && advanced_team.trim() !== ""
      ? advanced_team.trim()
      : null;

  const updatePayload: Record<string, unknown> = {
    home_score,
    away_score,
    status: "finished",
  };
  if (advancedTeam !== null) updatePayload.advanced_team = advancedTeam;

  const { error: updateErr } = await supabase
    .from("world_cup_matches")
    .update(updatePayload)
    .eq("id", match_id);

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 });
  }

  const { error: rpcErr } = await supabase
    .rpc("update_match_points", { p_match_id: match_id });

  if (rpcErr) {
    console.error("[admin/bolao-results] RPC error:", rpcErr.message);
    return NextResponse.json(
      { error: `Placar salvo, mas erro ao calcular pontos: ${rpcErr.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({ success: true, match_id, home_score, away_score, advanced_team: advancedTeam });
}
