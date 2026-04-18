import { NextResponse } from "next/server";

export async function GET() {
  try {
    const res = await fetch(
      "https://api.bcb.gov.br/dados/serie/bcdata.sgs.1/dados/ultimos/1?formato=json"
    );
    const usdData = res.ok ? await res.json() : null;
    const usd = usdData?.[0]?.valor ? parseFloat(usdData[0].valor) : 5.85;

    return NextResponse.json({
      USD: { rate: usd, pct: 0.3, emoji: "🇺🇸" },
      EUR: { rate: parseFloat((usd * 1.08).toFixed(2)), pct: 0.2, emoji: "🇪🇺" },
      BTC: { rate: 95000, pct: 1.2, emoji: "₿" },
    });
  } catch {
    return NextResponse.json({
      USD: { rate: 5.85, pct: 0.3, emoji: "🇺🇸" },
      EUR: { rate: 6.32, pct: 0.2, emoji: "🇪🇺" },
      BTC: { rate: 95000, pct: 1.2, emoji: "₿" },
    });
  }
}
