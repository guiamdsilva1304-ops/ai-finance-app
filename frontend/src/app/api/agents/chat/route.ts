import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "mcp-client-2025-04-04",
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    
    if (!response.ok) {
      console.error("Anthropic error:", response.status, text);
      return NextResponse.json({ error: text }, { status: response.status });
    }

    const data = JSON.parse(text);
    return NextResponse.json(data);
  } catch (err: any) {
    console.error("Proxy error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
