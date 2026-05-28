import { NextResponse } from "next/server";

export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://ai-finance-app-ashen.vercel.app";

  const response = await fetch(`${baseUrl}/api/agents/marketing`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-cron-secret": process.env.CRON_SECRET!,
    },
  });

  const data = await response.json();
  return NextResponse.json(data, { status: response.status });
}
