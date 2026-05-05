import { NextResponse } from "next/server";

const EMOJIS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", ARS: "🇦🇷",
  JPY: "🇯🇵", CAD: "🇨🇦", AUD: "🇦🇺", CHF: "🇨🇭",
  CNY: "🇨🇳", BTC: "₿",
};

export async function GET() {
  try {
    // Busca cotações em BRL via AwesomeAPI (gratuita, sem chave)
    const moedas = ["USD", "EUR", "GBP", "ARS", "JPY", "CAD", "AUD", "CHF", "CNY", "BTC"];
    const pares = moedas.map(m => `${m}-BRL`).join(",");

    const res = await fetch(
      `https://economia.awesomeapi.com.br/json/last/${pares}`,
      { next: { revalidate: 300 } } // cache 5 minutos
    );

    if (!res.ok) throw new Error("AwesomeAPI falhou");

    const data = await res.json();

    const rates: Record<string, { rate: number; pct_change: number; emoji: string; bid: number; ask: number }> = {};

    for (const moeda of moedas) {
      const key = `${moeda}BRL`;
      const item = data[key];
      if (item) {
        rates[moeda] = {
          rate: parseFloat(item.bid),
          bid: parseFloat(item.bid),
          ask: parseFloat(item.ask),
          pct_change: parseFloat(item.pctChange) || 0,
          emoji: EMOJIS[moeda] ?? "🌐",
        };
      }
    }

    return NextResponse.json(rates);
  } catch {
    // Fallback com valores aproximados e pct_change definido
    return NextResponse.json({
      USD: { rate: 5.85, bid: 5.85, ask: 5.87, pct_change: 0.3, emoji: "🇺🇸" },
      EUR: { rate: 6.32, bid: 6.32, ask: 6.34, pct_change: 0.2, emoji: "🇪🇺" },
      GBP: { rate: 7.41, bid: 7.41, ask: 7.43, pct_change: 0.1, emoji: "🇬🇧" },
      ARS: { rate: 0.006, bid: 0.006, ask: 0.006, pct_change: -0.5, emoji: "🇦🇷" },
      JPY: { rate: 0.039, bid: 0.039, ask: 0.039, pct_change: 0.1, emoji: "🇯🇵" },
      CAD: { rate: 4.28, bid: 4.28, ask: 4.30, pct_change: 0.2, emoji: "🇨🇦" },
      AUD: { rate: 3.72, bid: 3.72, ask: 3.74, pct_change: 0.1, emoji: "🇦🇺" },
      CHF: { rate: 6.61, bid: 6.61, ask: 6.63, pct_change: 0.0, emoji: "🇨🇭" },
      CNY: { rate: 0.81, bid: 0.81, ask: 0.81, pct_change: 0.0, emoji: "🇨🇳" },
      BTC: { rate: 95000, bid: 95000, ask: 95100, pct_change: 1.2, emoji: "₿" },
    });
  }
}
