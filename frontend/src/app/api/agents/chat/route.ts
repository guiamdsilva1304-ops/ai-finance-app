import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    // Remove mcp_servers — não suportado via REST API direta
    const { mcp_servers, ...cleanBody } = body;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.ANTHROPIC_API_KEY || "",
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify(cleanBody),
    });

    const text = await response.text();
    console.log("Anthropic status:", response.status);
    console.log("Anthropic response:", text.slice(0, 500));

    if (!response.ok) {
      return NextResponse.json({ error: text }, { status: response.status });
    }

    return NextResponse.json(JSON.parse(text));
  } catch (err: any) {
    console.error("Proxy error:", err.message);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
