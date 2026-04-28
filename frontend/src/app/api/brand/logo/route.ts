import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

const LOGO_PATH = "brand/logo.png";
const BUCKET = "imoney-media";

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

export async function GET() {
  const supabase = getSupabase();
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(LOGO_PATH);
  return NextResponse.json({ url: data.publicUrl });
}

export async function POST(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const form = await req.formData();
    const file = form.get("file") as File;
    if (!file) return NextResponse.json({ error: "Arquivo obrigatório" }, { status: 400 });

    const buffer = Buffer.from(await file.arrayBuffer());
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(LOGO_PATH, buffer, {
        contentType: file.type || "image/png",
        upsert: true,
      });

    if (error) throw new Error(error.message);

    const { data } = supabase.storage.from(BUCKET).getPublicUrl(LOGO_PATH);
    return NextResponse.json({ url: data.publicUrl });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
