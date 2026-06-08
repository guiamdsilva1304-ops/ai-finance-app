import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = 'force-dynamic'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co',
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? 'placeholder-key'
);

export async function GET() {
  const { data, error } = await supabase
    .from("admin_posts")
    .select("*")
    .not("plataforma", "is", null)
    .order("created_at", { ascending: false })
    .limit(60);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ posts: data });
}

export async function PATCH(req: Request) {
  const { id, action } = await req.json();
  const newStatus = action === "aprovar" ? "aprovado" : "rejeitado";

  const { error } = await supabase
    .from("admin_posts")
    .update({ status: newStatus })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, status: newStatus });
}
