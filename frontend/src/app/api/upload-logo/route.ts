import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
  
  const logo = readFileSync(join(process.cwd(), "public", "logo.png"));
  
  const { data, error } = await supabase.storage
    .from("imoney-media")
    .upload("brand/logo.png", logo, { contentType: "image/png", upsert: true });
  
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  
  const { data: url } = supabase.storage.from("imoney-media").getPublicUrl("brand/logo.png");
  return NextResponse.json({ url: url.publicUrl });
}
