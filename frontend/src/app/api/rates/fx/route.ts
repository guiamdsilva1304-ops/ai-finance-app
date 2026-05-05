export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

const EMOJIS: Record<string, string> = {
  USD: "🇺🇸", EUR: "🇪🇺", GBP: "🇬🇧", ARS: "🇦🇷",
  JPY: "🇯🇵", CAD: "🇨🇦", AUD: "🇦🇺", CHF: "🇨🇭",
  CNY: "🇨🇳", BTC: "₿",
};

// Codigos BCB para cotação em BRL
const BCB_CODES: Record<string, number> = {
  USD: 1,    // Dólar americano
  EUR: 21619, // Euro
  GBP: 21623, // Libra esterlina
  ARS: 21622, // Peso argentino
  JPY: 21621, // Iene japonês
  CAD: 21620, // Dólar canadense
  AUD: 21624, // Dólar australiano
  CHF: 21625, // Franco suíço
  CNY: 21626, // Yuan chinês
};

async function getBCBRate(code: number): Promise<number | null> {
  try {
    const res = await fetch(
      `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${code}/dados/ultimos/2?formato=json`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (!data?.length) return null;
    return parseFloat(data[data.length - 1].valor);
  } catch { return null; }
}

export async function GET() {
  try {
    // Busca USD e EUR do BCB (mais confiável)
    const [usd, eur] = await Promise.all([
      getBCBRate(BCB_CODES.USD),
      getBCBRate(BCB_CODES.EUR),
    ]);

    const usdRate = usd ?? 4.97;
    const eurRate = eur ?? 5.64;

    // Demais moedas calculadas com base no USD
    const rates: Record<string, { rate: number; pct_change: number; emoji: string }> = {
      USD: { rate: usdRate, pct_change: 0.2, emoji: "🇺🇸" },
      EUR: { rate: eurRate, pct_change: 0.1, emoji: "🇪🇺" },
      GBP: { rate: parseFloat((usdRate * 1.33).toFixed(4)), pct_change: 0.1, emoji: "🇬🇧" },
      ARS: { rate: parseFloat((usdRate * 0.001).toFixed(6)), pct_change: -0.5, emoji: "🇦🇷" },
      JPY: { rate: parseFloat((usdRate / 145).toFixed(6)), pct_change: 0.0, emoji: "🇯🇵" },
      CAD: { rate: parseFloat((usdRate * 0.73).toFixed(4)), pct_change: 0.1, emoji: "🇨🇦" },
      AUD: { rate: parseFloat((usdRate * 0.65).toFixed(4)), pct_change: 0.1, emoji: "🇦🇺" },
      CHF: { rate: parseFloat((usdRate * 1.13).toFixed(4)), pct_change: 0.0, emoji: "🇨🇭" },
      CNY: { rate: parseFloat((usdRate * 0.14).toFixed(4)), pct_change: 0.0, emoji: "🇨🇳" },
      BTC: { rate: 480000, pct_change: 1.2, emoji: "₿" },
    };

    return NextResponse.json(rates);
  } catch {
    return NextResponse.json({
      USD: { rate: 4.97, pct_change: 0.2, emoji: "🇺🇸" },
      EUR: { rate: 5.64, pct_change: 0.1, emoji: "🇪🇺" },
      GBP: { rate: 6.61, pct_change: 0.1, emoji: "🇬🇧" },
      ARS: { rate: 0.005, pct_change: -0.5, emoji: "🇦🇷" },
      JPY: { rate: 0.034, pct_change: 0.0, emoji: "🇯🇵" },
      CAD: { rate: 3.63, pct_change: 0.1, emoji: "🇨🇦" },
      AUD: { rate: 3.23, pct_change: 0.1, emoji: "🇦🇺" },
      CHF: { rate: 5.62, pct_change: 0.0, emoji: "🇨🇭" },
      CNY: { rate: 0.70, pct_change: 0.0, emoji: "🇨🇳" },
      BTC: { rate: 480000, pct_change: 1.2, emoji: "₿" },
    });
  }
}
