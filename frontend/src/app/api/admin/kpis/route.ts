import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";
import { computeKpis } from "@/lib/admin-kpis";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

export async function GET(req: NextRequest) {
  const denied = adminGuard(req);
  if (denied) return denied;

  try {
    return NextResponse.json(await computeKpis(supabase));
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Erro inesperado" },
      { status: 500 }
    );
  }
}
