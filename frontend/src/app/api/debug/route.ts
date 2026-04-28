import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export async function GET() {
  const key = process.env.ANTHROPIC_API_KEY || "NAO_ENCONTRADA";
  return NextResponse.json({
    key_prefix: key.slice(0, 15),
    key_length: key.length,
    has_key: !!process.env.ANTHROPIC_API_KEY,
    has_service_role: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  });
}
