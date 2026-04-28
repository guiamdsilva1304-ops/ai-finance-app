import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const anthropic = process.env.ANTHROPIC_API_KEY || "";
  const openai = process.env.OPENAI_API_KEY || "";
  return NextResponse.json({
    anthropic_prefix: anthropic.slice(0, 15),
    anthropic_length: anthropic.length,
    has_anthropic: !!anthropic,
    openai_prefix: openai.slice(0, 10),
    openai_length: openai.length,
    has_openai: !!openai,
    has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
