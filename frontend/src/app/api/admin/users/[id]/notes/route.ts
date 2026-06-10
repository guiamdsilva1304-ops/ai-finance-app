import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { adminGuard } from "@/lib/admin-auth";

export const dynamic = "force-dynamic";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? "https://placeholder.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? "placeholder-key"
);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const denied = adminGuard(req);
  if (denied) return denied;
  if (!UUID_RE.test(params.id)) {
    return NextResponse.json({ error: "id inválido" }, { status: 400 });
  }

  let body: { notes?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }
  if (typeof body.notes !== "string" || body.notes.length > 5000) {
    return NextResponse.json({ error: "notes deve ser string de até 5000 chars" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_profiles")
    .update({ admin_notes: body.notes })
    .eq("user_id", params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
